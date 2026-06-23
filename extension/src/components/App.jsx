import { useState, useEffect, useCallback } from "react";
import TabBtn from "./ui/TabBtn";
import TabBar from "./TabBar";
import SidebarHeader from "./SidebarHeader";
import StatusMessage from "./ui/StatusMessage";
import TrackForm from "./track/TrackForm";
import SettingsTab from "./settings/SettingsTab";
import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../hooks/useAuth";
import { useTrackForm } from "../hooks/useTrackForm";
import { useTrackPage } from "../hooks/useTrackPage";
export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("track");
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  const showStatus = useCallback((text, type = "info") => {
    setStatusMessage({ text, type });
    // setTimeout(() => setStatusMessage({ text: "", type: "" }), 5000);
  }, []);

  const settings = useSettings();
  const { saveSettings } = settings;
  const auth = useAuth();
  const { form, setFormField, setFormFields, handleSubmit, resumeFile, setResumeFile } = useTrackForm(
    showStatus,
    settings.clearAfterSave,
  );
  const { handleTrackCurrentPage } = useTrackPage(
    setFormFields,
    showStatus,
    settings.useAiExtractor,
  );

  const handleSaveSettings = useCallback(
    (e) => {
      saveSettings(e, showStatus);
    },
    [saveSettings, showStatus],
  );

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
        className={`fixed right-0 top-[15vh] h-[70vh] w-105 bg-white shadow-2xl border-2 border-gray-700 rounded-lg pointer-events-auto transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <SidebarHeader onClose={() => setIsOpen(false)} onTrack={() => handleTrackCurrentPage()} />

          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1 overflow-y-auto p-6">
            <StatusMessage text={statusMessage.text} type={statusMessage.type} />

            {activeTab === "track" && (
              <TrackForm
                form={form}
                setFormField={setFormField}
                handleSubmit={handleSubmit}
                resumeFile={resumeFile}
                setResumeFile={setResumeFile}
              />
            )}

            {activeTab === "settings" && (
              <SettingsTab
                authEmail={auth.authEmail}
                signInEmail={auth.signInEmail}
                setSignInEmail={auth.setSignInEmail}
                signInPassword={auth.signInPassword}
                setSignInPassword={auth.setSignInPassword}
                authLoading={auth.authLoading}
                authStatus={auth.authStatus}
                onSignIn={auth.handleSignIn}
                onSignOut={auth.handleSignOut}
                profiles={auth.profiles}
                selectedProfileId={auth.selectedProfileId}
                onSelectProfile={auth.handleSelectProfile}
                onRefreshProfiles={auth.refreshProfiles}
                backendUrl={settings.backendUrl}
                setBackendUrl={settings.setBackendUrl}
                useAiExtractor={settings.useAiExtractor}
                setUseAiExtractor={settings.setUseAiExtractor}
                deepseekApiKey={settings.deepseekApiKey}
                setDeepseekApiKey={settings.setDeepseekApiKey}
                deepseekModel={settings.deepseekModel}
                setDeepseekModel={settings.setDeepseekModel}
                clearAfterSave={settings.clearAfterSave}
                setClearAfterSave={settings.setClearAfterSave}
                onSaveSettings={handleSaveSettings}
              />
            )}
          </div>
        </div>
      </aside>
      <TabBtn isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  );
}
