import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
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
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState("");
  const [jobType, setJobType] = useState("");
  const [salary, setSalary] = useState("");
  const [securityClearance, setSecurityClearance] = useState("");
  const [url, setUrl] = useState("");
  const [datetime, setDatetime] = useState("");

  // Settings state
  const [backendUrl, setBackendUrl] = useState("http://192.168.110.252:4000");
  const [useAiExtractor, setUseAiExtractor] = useState(true);
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [deepseekModel, setDeepseekModel] = useState("arcee-ai/trinity-large-preview:free");

  // Auth state
  const [authEmail, setAuthEmail] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState({ text: "", type: "" });

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get([
        "backendUrl",
        "useAiExtractor",
        "deepseekApiKey",
        "deepseekModel",
        "authEmail",
      ]);
      if (result.backendUrl) setBackendUrl(result.backendUrl);
      else setBackendUrl("http://192.168.110.252:4000");
      setUseAiExtractor(Boolean(result.useAiExtractor));
      setDeepseekApiKey(result.deepseekApiKey || "");
      setDeepseekModel(result.deepseekModel || "arcee-ai/trinity-large-preview:free");
      if (result.authEmail) setAuthEmail(result.authEmail);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const showStatus = useCallback((text, type = "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: "", type: "" }), 5000);
  }, []);

  const showAuthStatus = (text, type = "success") => {
    setAuthStatus({ text, type });
    setTimeout(() => setAuthStatus({ text: "", type: "" }), 5000);
  };


  const getPageTextForAI = () =>
    (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 24000);

  const requestAIExtraction = useCallback(
    (fallback) =>
      new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: "EXTRACT_JOB_INFO_AI",
            data: {
              url: window.location.href,
              pageTitle: document.title || "",
              pageText: getPageTextForAI(),
              fallback,
            },
          },
          resolve,
        );
      }),
    [],
  );

  const mergeJobInfo = useCallback(
    (fallback, aiResult) => ({
      jobTitle: aiResult?.jobTitle || fallback.jobTitle || "",
      company: aiResult?.company || fallback.company || "",
      location: aiResult?.location || fallback.location || "",
      workType: aiResult?.workType || fallback.workType || "",
      jobType: aiResult?.jobType || fallback.jobType || "",
      salary: aiResult?.salary || fallback.salary || "",
      securityClearance: aiResult?.securityClearance || fallback.securityClearance || "",
      url: fallback.url || window.location.href,
    }),
    [],
  );

  const handleTrackCurrentPage = useCallback(
    async ({ silent = false } = {}) => {
      const fallbackInfo = extractJobInfo();
      let finalInfo = fallbackInfo;
      let aiFailed = false;

      const aiSettings = await chrome.storage.local.get(["useAiExtractor"]);
      if (aiSettings.useAiExtractor) {
        if (!silent) showStatus("Extracting with AI...", "info");
        const aiResponse = await requestAIExtraction(fallbackInfo);
        if (aiResponse?.success && aiResponse.result) {
          finalInfo = mergeJobInfo(fallbackInfo, aiResponse.result);
        } else if (!silent) {
          aiFailed = true;
          showStatus(
            `AI extraction failed, used fallback parser: ${aiResponse?.error || "Unknown error"}`,
            "error",
          );
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
    },
    [mergeJobInfo, requestAIExtraction, showStatus],
  );

  useEffect(() => {
    setDatetime(getBangkokDateTimeLocal());
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!jobTitle || !company || !url || !datetime) {
      showStatus("Please fill in all required fields", "error");
      return;
    }

    showStatus("Saving...", "info");

    const data = {
      jobTitle,
      company,
      location,
      workType,
      jobType,
      salary,
      securityClearance,
      url,
      datetime: formatDateTime(datetime),
    };

    chrome.runtime.sendMessage({ type: "SAVE_APPLICATION", data }, (response) => {
      if (response?.success) {
        showStatus("Saved successfully!", "success");
        setJobTitle("");
        setCompany("");
        setLocation("");
        setWorkType("");
        setJobType("");
        setSalary("");
        setSecurityClearance("");
        setUrl("");
        setDatetime(getBangkokDateTimeLocal());
      } else {
        showStatus(`Error: ${response?.error || "Unknown error"}`, "error");
      }
    });
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "BACKEND_SIGNIN", data: { email: signInEmail, password: signInPassword } },
          resolve,
        );
      });
      if (response?.success) {
        setAuthEmail(response.result.email);
        setSignInEmail("");
        setSignInPassword("");
        showAuthStatus(`Signed in as ${response.result.email}`, "success");
      } else {
        showAuthStatus(response?.error || "Sign in failed", "error");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "BACKEND_SIGNOUT" }, resolve);
    });
    setAuthEmail("");
    showAuthStatus("Signed out", "success");
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await chrome.storage.local.set({
      backendUrl: backendUrl.trim().replace(/\/$/, ""),
      useAiExtractor,
      deepseekApiKey: deepseekApiKey.trim(),
      deepseekModel: deepseekModel.trim() || "arcee-ai/trinity-large-preview:free",
    });
    showStatus("Settings saved!", "success");
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "F9") {
        e.preventDefault();
        setIsOpen(true);
        void handleTrackCurrentPage();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleTrackCurrentPage]);

  return (
    <div className="fixed inset-0 pointer-events-none z-2147483647 whitespace-normal">
      <aside
        className={`fixed right-0 top-[15vh] h-[70vh] w-[420px] bg-white shadow-2xl border-2 border-gray-700 rounded-lg pointer-events-auto transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 text-white px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-semibold">Job Application Tracker</h1>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 transition-colors"
                aria-label="Close sidebar"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-300 mt-1">Press F9 to quick track</p>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                form="track-form"
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors font-medium"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleTrackCurrentPage}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Track
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {["track", "settings"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-white text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
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
              <form id="track-form" onSubmit={handleSubmit} className="space-y-4">
                {[
                  { label: "Job Title", value: jobTitle, setter: setJobTitle, placeholder: "e.g., Senior Software Engineer", required: true },
                  { label: "Company", value: company, setter: setCompany, placeholder: "e.g., Google", required: true },
                  { label: "Location", value: location, setter: setLocation, placeholder: "e.g., Bangkok, Thailand / Remote" },
                  { label: "Work Type", value: workType, setter: setWorkType, placeholder: "e.g., Remote, Hybrid, Onsite" },
                  { label: "Job Type", value: jobType, setter: setJobType, placeholder: "e.g., Full-time, Contract" },
                  { label: "Salary", value: salary, setter: setSalary, placeholder: "e.g., $90,000 - $120,000 / year" },
                  { label: "Security Clearance", value: securityClearance, setter: setSecurityClearance, placeholder: "e.g., Secret, TS/SCI" },
                ].map(({ label, value, setter, placeholder, required }) => (
                  <div key={label}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={placeholder}
                      required={required}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                
              </form>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Setup Guide */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Setup Guide</h3>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-blue-900">
                    <li>
                      <span className="font-medium">Get an API key from OpenRouter:</span>{" "}
                      Go to{" "}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        openrouter.ai/keys
                      </a>
                      , sign in, create a key, then paste it into the API Key field below.
                    </li>
                    <li>
                      <span className="font-medium">Register an account:</span>{" "}
                      If you do not have an account yet, use the registration link in the Account section.
                    </li>
                    <li>
                      <span className="font-medium">Sign in from the extension:</span>{" "}
                      Enter your email and password in the Account section and click Sign In.
                    </li>
                    <li>
                      <span className="font-medium">Enable AI extraction:</span>{" "}
                      If you want AI-based extraction, you must check{" "}
                      <span className="font-semibold">Use OpenRouter for extraction</span>.
                    </li>
                  </ol>
                </div>

                {/* Account Section */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Account</h3>
                  {authEmail ? (
                    <div>
                      <p className="text-xs text-gray-600 mb-3">
                        Signed in as <span className="font-medium text-gray-900">{authEmail}</span>
                      </p>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <form onSubmit={handleSignIn} className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={signInEmail}
                            onChange={(e) => setSignInEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                          <input
                            type="password"
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={authLoading}
                          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-60"
                        >
                          {authLoading ? "Signing in..." : "Sign In"}
                        </button>
                      </form>
                      <p className="text-xs text-gray-600">
                        Not yet registered?{" "}
                        <a
                          href="http://192.168.110.252:5173/signup"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-800 hover:underline font-medium"
                        >
                          Register here
                        </a>
                      </p>
                    </div>
                  )}
                  {authStatus.text && (
                    <div
                      className={`mt-3 p-2 rounded text-xs ${
                        authStatus.type === "success"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {authStatus.text}
                    </div>
                  )}
                </div>

                {/* Settings Form */}
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Backend URL</label>
                    <input
                      type="url"
                      value={backendUrl}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      placeholder="http://192.168.110.252:4000"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                    <small className="text-xs text-gray-500">URL of your Express backend server</small>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Use OpenRouter for extraction</label>
                      <input
                        type="checkbox"
                        checked={useAiExtractor}
                        onChange={(e) => setUseAiExtractor(e.target.checked)}
                        className="h-4 w-4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                      <input
                        type="password"
                        value={deepseekApiKey}
                        onChange={(e) => setDeepseekApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Free Model</label>
                      <input
                        type="text"
                        value={deepseekModel}
                        onChange={(e) => setDeepseekModel(e.target.value)}
                        placeholder="arcee-ai/trinity-large-preview:free"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      />
                      <small className="text-xs text-gray-500">Recommended: arcee-ai/trinity-large-preview:free</small>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Save Settings
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </aside>
      <TabBtn isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  );
}
