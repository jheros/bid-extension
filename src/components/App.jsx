import { useState, useEffect, useCallback } from "react";
import TabBtn from "./ui/TabBtn";
import { extractJobInfo } from "../utils/jobExtractor";
import { getBangkokDateTimeLocal, formatDateTime } from "../utils/datetime";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("track");
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Track form state
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState("");
  const [jobType, setJobType] = useState("");
  const [salary, setSalary] = useState("");
  const [securityClearance, setSecurityClearance] = useState("");
  const [url, setUrl] = useState("");
  const [datetime, setDatetime] = useState("");
  
  // Settings state
  const [sheetId, setSheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [useAiExtractor, setUseAiExtractor] = useState(false);
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [deepseekModel, setDeepseekModel] = useState("deepseek-chat");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [serviceAccountStatus, setServiceAccountStatus] = useState({ text: "", type: "" });

  // Load saved settings
  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get([
        'sheetId',
        'sheetName',
        'serviceAccount',
        'useAiExtractor',
        'deepseekApiKey',
        'deepseekModel'
      ]);
      if (result.sheetId) setSheetId(result.sheetId);
      if (result.sheetName) setSheetName(result.sheetName);
      setUseAiExtractor(Boolean(result.useAiExtractor));
      setDeepseekApiKey(result.deepseekApiKey || "");
      setDeepseekModel(result.deepseekModel || "deepseek-chat");
      if (result.serviceAccount) {
        setServiceAccountStatus({
          text: `✓ Service account configured (${result.serviceAccount.client_email})`,
          type: "success"
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Show status message
  const showStatus = useCallback((text, type = "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: "", type: "" }), 5000);
  }, []);

  const fetchStats = useCallback(async ({ silent = false } = {}) => {
    setStatsLoading(true);
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_APPLICATION_STATS' }, (res) =>
          resolve(res)
        );
      });

      if (response?.success) {
        setStats(response.result);
      } else if (!silent) {
        showStatus(`Stats error: ${response?.error || 'Unknown error'}`, "error");
      }
    } catch (error) {
      if (!silent) showStatus(`Stats error: ${error.message}`, "error");
    } finally {
      setStatsLoading(false);
    }
  }, [showStatus]);

  // Show service account status
  const showServiceAccountStatus = (text, type = "success") => {
    setServiceAccountStatus({ text, type });
    setTimeout(() => setServiceAccountStatus({ text: "", type: "" }), 5000);
  };

  const getPageTextForAI = () =>
    (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 24000);

  const requestAIExtraction = useCallback((fallback) =>
    new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'EXTRACT_JOB_INFO_AI',
          data: {
            url: window.location.href,
            pageTitle: document.title || "",
            pageText: getPageTextForAI(),
            fallback
          }
        },
        (response) => resolve(response)
      );
    }), []);

  const mergeJobInfo = useCallback((fallback, aiResult) => ({
    jobTitle: aiResult?.jobTitle || fallback.jobTitle || "",
    company: aiResult?.company || fallback.company || "",
    location: aiResult?.location || fallback.location || "",
    workType: aiResult?.workType || fallback.workType || "",
    jobType: aiResult?.jobType || fallback.jobType || "",
    salary: aiResult?.salary || fallback.salary || "",
    securityClearance:
      aiResult?.securityClearance || fallback.securityClearance || "",
    url: fallback.url || window.location.href
  }), []);

  // Track current page
  const handleTrackCurrentPage = useCallback(async ({ silent = false } = {}) => {
    const fallbackInfo = extractJobInfo();
    let finalInfo = fallbackInfo;
    let aiFailed = false;

    const aiSettings = await chrome.storage.local.get(['useAiExtractor']);
    if (aiSettings.useAiExtractor) {
      if (!silent) showStatus("Extracting with DeepSeek...", "info");
      const aiResponse = await requestAIExtraction(fallbackInfo);
      if (aiResponse?.success && aiResponse.result) {
        finalInfo = mergeJobInfo(fallbackInfo, aiResponse.result);
      } else if (!silent) {
        aiFailed = true;
        showStatus(`AI extraction failed, used fallback parser: ${aiResponse?.error || "Unknown error"}`, "error");
      }
    }

    setJobTitle(finalInfo.jobTitle || "");
    setCompany(finalInfo.company || "");
    setLocation(finalInfo.location || "");
    setWorkType(finalInfo.workType || "");
    setJobType(finalInfo.jobType || "");
    setSalary(finalInfo.salary || "");
    setSecurityClearance(finalInfo.securityClearance || "");
    setUrl(finalInfo.url || window.location.href);

    if (!silent && !aiFailed) {
      showStatus("Page info extracted! Please review and save.", "success");
    }
  }, [mergeJobInfo, requestAIExtraction, showStatus]);

  // Initialize form with current page info
  useEffect(() => {
    setDatetime(getBangkokDateTimeLocal());
    loadSettings();
    void fetchStats({ silent: true });
  }, [fetchStats]);

  // Save to Google Sheets
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!jobTitle || !company || !url || !datetime) {
      showStatus("Please fill in all fields", "error");
      return;
    }

    showStatus("Saving to Google Sheets...", "info");

    const data = {
      jobTitle,
      company,
      location,
      workType,
      jobType,
      salary,
      securityClearance,
      url,
      datetime: formatDateTime(datetime)
    };

    chrome.runtime.sendMessage(
      { type: 'SAVE_TO_SHEETS', data },
      (response) => {
        if (response?.success) {
          showStatus("✅ Successfully saved to Google Sheets!", "success");
          // Clear form
          setJobTitle("");
          setCompany("");
          setLocation("");
          setWorkType("");
          setJobType("");
          setSalary("");
          setSecurityClearance("");
          setUrl("");
          setDatetime(getBangkokDateTimeLocal());
          void fetchStats({ silent: true });
        } else {
          showStatus(`Error: ${response?.error || 'Unknown error'}`, "error");
        }
      }
    );
  };

  // Save service account
  const handleSaveServiceAccount = async () => {
    if (!serviceAccountJson.trim()) {
      showServiceAccountStatus("Please paste service account JSON", "error");
      return;
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountJson);

      if (!serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error("Invalid service account JSON: missing required fields");
      }

      await chrome.storage.local.set({ serviceAccount });
      await chrome.storage.local.remove(['cachedToken', 'tokenExpiry']);

      showServiceAccountStatus("✅ Service account saved successfully!", "success");
      setServiceAccountJson("");
      
      // Update status display
      setTimeout(() => {
        setServiceAccountStatus({ 
          text: `✓ Service account configured (${serviceAccount.client_email})`, 
          type: "success" 
        });
      }, 2000);
    } catch (error) {
      showServiceAccountStatus(`❌ Error: ${error.message}`, "error");
    }
  };

  // Save settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();

    const payload = {
      sheetName: sheetName || 'Sheet1',
      useAiExtractor,
      deepseekApiKey: deepseekApiKey.trim(),
      deepseekModel: deepseekModel.trim() || 'deepseek-chat'
    };

    if (sheetId.trim()) {
      payload.sheetId = sheetId.trim();
    }

    await chrome.storage.local.set(payload);
    if (!sheetId.trim()) {
      showStatus("✅ Settings saved. Add Sheet ID before saving applications.", "info");
      return;
    }

    showStatus("✅ Settings saved successfully!", "success");
  };

  // Listen for F9 keypress
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setIsOpen(true);
        void handleTrackCurrentPage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleTrackCurrentPage]);

  return (
    <div className="fixed inset-0 pointer-events-none z-2147483647 whitespace-normal">
      <aside
        className={`fixed right-0 top-[15vh] h-[70vh] w-[420px] bg-white shadow-2xl border-l border-gray-200 pointer-events-auto transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 text-white px-6 py-4">
            <h1 className="text-xl font-semibold">Job Application Tracker</h1>
            <p className="text-sm text-gray-300 mt-1">Press F9 to quick track</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setActiveTab("track")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "track"
                  ? "bg-white text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Track
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "settings"
                  ? "bg-white text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Settings
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Status Message */}
            {statusMessage.text && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  statusMessage.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : statusMessage.type === "error"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            {/* Track Tab */}
            {activeTab === "track" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g., Google"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Bangkok, Thailand / Remote"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work Type
                  </label>
                  <input
                    type="text"
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    placeholder="e.g., Remote, Hybrid, Onsite"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Type
                  </label>
                  <input
                    type="text"
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    placeholder="e.g., Full-time, Contract"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary
                  </label>
                  <input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g., $90,000 - $120,000 / year"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Clearance
                  </label>
                  <input
                    type="text"
                    value={securityClearance}
                    onChange={(e) => setSecurityClearance(e.target.value)}
                    placeholder="e.g., Secret, TS/SCI"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Save to Sheets
                  </button>
                  <button
                    type="button"
                    onClick={handleTrackCurrentPage}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Track Current Page
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Application Tracker (Bangkok 08:00 cutoff)
                    </h3>
                    <button
                      type="button"
                      onClick={() => void fetchStats()}
                      className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                    >
                      {statsLoading ? "Loading..." : "Refresh"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="p-2 rounded bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500">Day</p>
                      <p className="text-lg font-semibold">{stats?.day?.total || 0}</p>
                    </div>
                    <div className="p-2 rounded bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500">Week</p>
                      <p className="text-lg font-semibold">{stats?.week?.total || 0}</p>
                    </div>
                    <div className="p-2 rounded bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500">Month</p>
                      <p className="text-lg font-semibold">{stats?.month?.total || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {["day", "week", "month"].map((period) => (
                      <div key={period} className="p-2 rounded bg-white border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 capitalize mb-1">
                          {period} by platform
                        </p>
                        {Object.keys(stats?.[period]?.byPlatform || {}).length === 0 ? (
                          <p className="text-xs text-gray-500">No data</p>
                        ) : (
                          <div className="text-xs text-gray-700 space-y-1">
                            {Object.entries(stats?.[period]?.byPlatform || {})
                              .sort((a, b) => b[1] - a[1])
                              .map(([platform, count]) => (
                                <p key={`${period}-${platform}`}>
                                  <span className="capitalize">{platform}</span>: {count}
                                </p>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Service Account Section */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Service Account Configuration
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Upload your service account JSON file or paste the credentials below.
                  </p>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Account JSON
                    </label>
                    <textarea
                      value={serviceAccountJson}
                      onChange={(e) => setServiceAccountJson(e.target.value)}
                      rows="6"
                      placeholder="Paste your service account JSON here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-xs font-mono"
                    />
                    <small className="text-xs text-gray-500">
                      Get this from Google Cloud Console → Service Accounts
                    </small>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveServiceAccount}
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Save Service Account
                  </button>

                  {serviceAccountStatus.text && (
                    <div
                      className={`mt-3 p-2 rounded text-xs ${
                        serviceAccountStatus.type === "success"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {serviceAccountStatus.text}
                    </div>
                  )}
                </div>

                {/* Settings Form */}
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Sheet ID
                    </label>
                    <input
                      type="text"
                      value={sheetId}
                      onChange={(e) => setSheetId(e.target.value)}
                      placeholder="Enter your Sheet ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      required
                    />
                    <small className="text-xs text-gray-500">
                      Found in your Google Sheets URL
                    </small>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sheet Name (Tab Name)
                    </label>
                    <input
                      type="text"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="Sheet1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                    <small className="text-xs text-gray-500">
                      The name of the sheet/tab where data will be saved (default: Sheet1)
                    </small>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Use DeepSeek for extraction
                      </label>
                      <input
                        type="checkbox"
                        checked={useAiExtractor}
                        onChange={(e) => setUseAiExtractor(e.target.checked)}
                        className="h-4 w-4"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DeepSeek API Key
                      </label>
                      <input
                        type="password"
                        value={deepseekApiKey}
                        onChange={(e) => setDeepseekApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DeepSeek Model
                      </label>
                      <input
                        type="text"
                        value={deepseekModel}
                        onChange={(e) => setDeepseekModel(e.target.value)}
                        placeholder="deepseek-chat"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      />
                      <small className="text-xs text-gray-500">
                        Recommended: deepseek-chat
                      </small>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Save Settings
                  </button>
                </form>

                {/* Help Section */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Setup Guide</h3>
                  <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Create a Google Sheet with headers: Date & Time, URL, Job Title, Company, Location, Work Type, Job Type, Salary, Security Clearance</li>
                    <li>Create a service account in Google Cloud Console</li>
                    <li>Download the service account JSON file</li>
                    <li>Share your Google Sheet with the service account email</li>
                    <li>Paste the JSON content above and save</li>
                    <li>Enter your Sheet ID and Sheet Name (tab name) and save settings</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
      <TabBtn isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  );
}
