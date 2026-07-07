import { MESSAGE_TYPES, NOTIFICATION, ERRORS } from '../lib/constants.js';
import { getBangkokDateTime, formatAppliedAtForNotification } from '../lib/datetime.js';
import { showNotification } from '../services/notifications.js';
import { signIn, signOut } from '../services/auth.js';
import { saveApplication, getApplicationsByCompany } from '../services/applications.js';
import { extractJobInfoWithAI, listOpenAiModels } from '../services/ai/extractor.js';
import { lookupCachedParse, storeCachedParse } from '../services/backend/jobCache.js';

function handleShowNotification(data) {
  showNotification({
    title: data.title || NOTIFICATION.DEFAULT_TITLE,
    message: data.message || '',
    priority: NOTIFICATION.PRIORITY.LOW,
  });
}

function handleSaveApplication(requestData, sendResponse) {
  const dataWithDateTime = {
    ...requestData,
    datetime: requestData.datetime || getBangkokDateTime(),
  };
  saveApplication(dataWithDateTime)
    .then((result) => {
      showNotification({
        title: 'Job Application Saved!',
        message: `${requestData.jobTitle || 'Application'} at ${requestData.company || 'Company'} saved successfully.`,
        priority: NOTIFICATION.PRIORITY.HIGH,
      });
      sendResponse({ success: true, result });
    })
    .catch((error) => {
      if (error.message === ERRORS.DUPLICATE_APPLICATION) {
        showNotification({
          title: 'DUPLICATE APPLICATION WARNING',
          message: `You have already applied to "${requestData.jobTitle || 'this position'}" at ${requestData.company || 'this company'}!`,
          priority: NOTIFICATION.PRIORITY.HIGH,
          requireInteraction: true,
        });
        sendResponse({ success: false, error: error.message });
        return;
      }
      showNotification({
        title: 'Save Failed',
        message: `Could not save application. Error: ${error.message}`,
        priority: NOTIFICATION.PRIORITY.HIGH,
      });
      sendResponse({ success: false, error: error.message });
    });
}

function handleSignIn(email, password, sendResponse) {
  signIn(email, password)
    .then((result) => sendResponse({ success: true, result }))
    .catch((error) => sendResponse({ success: false, error: error.message }));
}

function handleSignOut(sendResponse) {
  signOut().then(() => sendResponse({ success: true }));
}

function handleExtractJobInfoAI(data, sendResponse) {
  extractJobInfoWithAI(data)
    .then(({ result, model }) => sendResponse({ success: true, result, model }))
    .catch((error) => sendResponse({ success: false, error: error.message }));
}

function handleCacheLookup(data, sendResponse) {
  lookupCachedParse(data?.url)
    .then((result) => sendResponse({ success: true, ...result }))
    .catch(() => sendResponse({ success: true, cached: false }));
}

function handleCacheStore(data, sendResponse) {
  storeCachedParse(data || {})
    .then(() => sendResponse({ success: true }))
    .catch(() => sendResponse({ success: false }));
}

function handleListOpenAiModels(data, sendResponse) {
  listOpenAiModels(data?.apiKey)
    .then((models) => sendResponse({ success: true, models }))
    .catch((error) => sendResponse({ success: false, error: error.message }));
}

function handleCheckSameCompany(data, sendResponse) {
  const company = data?.company?.trim();
  const profileId = data?.profileId || null;
  if (!company) {
    sendResponse({ success: true, applications: [] });
    return;
  }
  getApplicationsByCompany(company, profileId)
    .then((applications) => {
      if (applications.length > 0) {
        const parts = applications.map(
          (a) => `${a.job_title || 'Application'} on ${formatAppliedAtForNotification(a.applied_at)}`
        );
        const message = `You've already applied to ${company} for: ${parts.join('; ')}`;
        showNotification({
          title: 'Same company',
          message,
          priority: NOTIFICATION.PRIORITY.HIGH,
        });
      }
      sendResponse({ success: true, applications });
    })
    .catch(() => sendResponse({ success: true, applications: [] }));
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.type) {
    case MESSAGE_TYPES.SHOW_NOTIFICATION:
      handleShowNotification(request.data || {});
      break;
    case MESSAGE_TYPES.SAVE_APPLICATION:
      handleSaveApplication(request.data || {}, sendResponse);
      return true;
    case MESSAGE_TYPES.BACKEND_SIGNIN:
      handleSignIn(request.data?.email, request.data?.password, sendResponse);
      return true;
    case MESSAGE_TYPES.BACKEND_SIGNOUT:
      handleSignOut(sendResponse);
      return true;
    case MESSAGE_TYPES.EXTRACT_JOB_INFO_AI:
      handleExtractJobInfoAI(request.data || {}, sendResponse);
      return true;
    case MESSAGE_TYPES.CACHE_LOOKUP:
      handleCacheLookup(request.data || {}, sendResponse);
      return true;
    case MESSAGE_TYPES.CACHE_STORE:
      handleCacheStore(request.data || {}, sendResponse);
      return true;
    case MESSAGE_TYPES.LIST_OPENAI_MODELS:
      handleListOpenAiModels(request.data || {}, sendResponse);
      return true;
    case MESSAGE_TYPES.CHECK_SAME_COMPANY:
      handleCheckSameCompany(request.data || {}, sendResponse);
      return true;
    default:
      break;
  }
});

console.log('Job Application Tracker: Background script loaded');
