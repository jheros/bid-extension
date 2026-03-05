import SetupGuide from "./SetupGuide";
import AccountSection from "./AccountSection";
import ProfileSection from "./ProfileSection";
import SettingsForm from "./SettingsForm";

export default function SettingsTab({
  // Auth
  authEmail,
  signInEmail,
  setSignInEmail,
  signInPassword,
  setSignInPassword,
  authLoading,
  authStatus,
  onSignIn,
  onSignOut,
  profiles,
  selectedProfileId,
  onSelectProfile,
  onRefreshProfiles,
  // Settings form
  backendUrl,
  setBackendUrl,
  useAiExtractor,
  setUseAiExtractor,
  deepseekApiKey,
  setDeepseekApiKey,
  deepseekModel,
  setDeepseekModel,
  clearAfterSave,
  setClearAfterSave,
  onSaveSettings,
}) {
  return (
    <div className="space-y-6">
      <SetupGuide />
      <AccountSection
        authEmail={authEmail}
        signInEmail={signInEmail}
        setSignInEmail={setSignInEmail}
        signInPassword={signInPassword}
        setSignInPassword={setSignInPassword}
        authLoading={authLoading}
        authStatus={authStatus}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />
      {authEmail && (
        <ProfileSection
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onSelectProfile={onSelectProfile}
          onRefreshProfiles={onRefreshProfiles}
        />
      )}
      <SettingsForm
        backendUrl={backendUrl}
        setBackendUrl={setBackendUrl}
        useAiExtractor={useAiExtractor}
        setUseAiExtractor={setUseAiExtractor}
        deepseekApiKey={deepseekApiKey}
        setDeepseekApiKey={setDeepseekApiKey}
        deepseekModel={deepseekModel}
        setDeepseekModel={setDeepseekModel}
        clearAfterSave={clearAfterSave}
        setClearAfterSave={setClearAfterSave}
        onSubmit={onSaveSettings}
      />
    </div>
  );
}
