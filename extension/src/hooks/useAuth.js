import { useState, useEffect, useCallback } from "react";

export function useAuth() {
  const [authEmail, setAuthEmail] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState({ text: "", type: "" });

  useEffect(() => {
    chrome.storage.local.get(["authEmail"]).then((result) => {
      if (result.authEmail) setAuthEmail(result.authEmail);
    });
  }, []);

  const showAuthStatus = useCallback((text, type = "success") => {
    setAuthStatus({ text, type });
    setTimeout(() => setAuthStatus({ text: "", type: "" }), 5000);
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
    showAuthStatus("Signed out", "success");
  }, [showAuthStatus]);

  return {
    authEmail,
    signInEmail,
    setSignInEmail,
    signInPassword,
    setSignInPassword,
    authLoading,
    authStatus,
    handleSignIn,
    handleSignOut,
  };
}
