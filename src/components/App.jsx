import { useState, useEffect } from "react";
import TabBtn from "./ui/TabBtn";
import { extractJobInfo } from "../utils/jobExtractor";
import { getBangkokDateTimeLocal, formatDateTime } from "../utils/datetime";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("track");
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  
  // Track form state
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [datetime, setDatetime] = useState("");
  
  // Settings state
  const [sheetId, setSheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [serviceAccountStatus, setServiceAccountStatus] = useState({ text: "", type: "" });

  // Initialize form with current page info
  useEffect(() => {
    setDatetime(getBangkokDateTimeLocal()); 
    loadSettings();
    
    // Set current page URL
    setUrl(window.location.href);
    
    // Extract job info from current page
    const jobInfo = extractJobInfo();
    if (jobInfo.jobTitle) setJobTitle(jobInfo.jobTitle);
    if (jobInfo.company) setCompany(jobInfo.company);
  }, []);

  // Load saved settings
  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get(['sheetId', 'sheetName', 'serviceAccount']);
      if (result.sheetId) setSheetId(result.sheetId);
      if (result.sheetName) setSheetName(result.sheetName);
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
  const showStatus = (text, type = "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: "", type: "" }), 5000);
  };

  // Show service account status
  const showServiceAccountStatus = (text, type = "success") => {
    setServiceAccountStatus({ text, type });
    setTimeout(() => setServiceAccountStatus({ text: "", type: "" }), 5000);
  };

  // Track current page
  const handleTrackCurrentPage = () => {
    const jobInfo = extractJobInfo();
    setJobTitle(jobInfo.jobTitle || "");
    setCompany(jobInfo.company || "");
    setUrl(jobInfo.url || window.location.href);
    showStatus("Page info extracted! Please review and save.", "success");
  };

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
          setUrl("");
          setDatetime(getBangkokDateTimeLocal());
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

    if (!sheetId) {
      showStatus("Please enter Sheet ID", "error");
      return;
    }

    await chrome.storage.local.set({ sheetId, sheetName: sheetName || 'Sheet1' });
    showStatus("✅ Settings saved successfully!", "success");
  };

  // Listen for F9 keypress
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setIsOpen(true);
        handleTrackCurrentPage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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
                    <li>Create a Google Sheet with headers: Date & Time, URL, Job Title, Company</li>
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
