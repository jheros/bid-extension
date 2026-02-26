/**
 * Extension-wide constants: message types and notification defaults.
 */

export const MESSAGE_TYPES = {
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
  SAVE_APPLICATION: 'SAVE_APPLICATION',
  CHECK_SAME_COMPANY: 'CHECK_SAME_COMPANY',
  BACKEND_SIGNIN: 'BACKEND_SIGNIN',
  BACKEND_SIGNOUT: 'BACKEND_SIGNOUT',
  EXTRACT_JOB_INFO_AI: 'EXTRACT_JOB_INFO_AI',
};

export const NOTIFICATION = {
  DEFAULT_TITLE: 'Job Application Tracker',
  ICON_PATH: 'icons/icon48.png',
  PRIORITY: {
    LOW: 1,
    HIGH: 2,
  },
};

export const ERRORS = {
  DUPLICATE_APPLICATION: 'DUPLICATE_APPLICATION',
};
