import { useState, useEffect, useCallback } from "react";
import { getProfiles } from "../services/profiles.js";

export function useAuth() {
  const [authEmail, setAuthEmail] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState({ text: "", type: "" });
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  useEffect(() => {
    chrome.storage.local
      .get(["authEmail", "authProfiles", "selectedProfileId"])
      .then((result) => {
        if (result.authEmail) setAuthEmail(result.authEmail);
        if (result.authProfiles) setProfiles(result.authProfiles);
        if (result.selectedProfileId) setSelectedProfileId(result.selectedProfileId);
      });
  }, []);

  const showAuthStatus = useCallback((text, type = "success") => {
    setAuthStatus({ text, type });
    setTimeout(() => setAuthStatus({ text: "", type: "" }), 5000);
  }, []);

  const handleSelectProfile = useCallback(async (profileId) => {
    setSelectedProfileId(profileId);
    await chrome.storage.local.set({ selectedProfileId: profileId });
  }, []);

  const handleSignIn = useCallback(
    async (e) => {
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

          // Fetch profiles after sign-in
          const fetchedProfiles = await getProfiles();
          setProfiles(fetchedProfiles);
          await chrome.storage.local.set({ authProfiles: fetchedProfiles });

          // Auto-select first profile if only one exists
          if (fetchedProfiles.length === 1) {
            setSelectedProfileId(fetchedProfiles[0].id);
            await chrome.storage.local.set({ selectedProfileId: fetchedProfiles[0].id });
          }
        } else {
          showAuthStatus(response?.error || "Sign in failed", "error");
        }
      } finally {
        setAuthLoading(false);
      }
    },
    [signInEmail, signInPassword, showAuthStatus],
  );

  const handleSignOut = useCallback(async () => {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "BACKEND_SIGNOUT" }, resolve);
    });
    setAuthEmail("");
    setProfiles([]);
    setSelectedProfileId("");
    await chrome.storage.local.remove(["authProfiles", "selectedProfileId"]);
    showAuthStatus("Signed out", "success");
  }, [showAuthStatus]);

  const refreshProfiles = useCallback(async () => {
    const fetchedProfiles = await getProfiles();
    setProfiles(fetchedProfiles);
    await chrome.storage.local.set({ authProfiles: fetchedProfiles });
    // If selected profile no longer exists, clear selection
    if (selectedProfileId && !fetchedProfiles.find((p) => p.id === selectedProfileId)) {
      setSelectedProfileId("");
      await chrome.storage.local.remove("selectedProfileId");
    }
  }, [selectedProfileId]);

  return {
    authEmail,
    signInEmail,
    setSignInEmail,
    signInPassword,
    setSignInPassword,
    authLoading,
    authStatus,
    profiles,
    selectedProfileId,
    handleSelectProfile,
    refreshProfiles,
    handleSignIn,
    handleSignOut,
  };
}
