import StatusMessage from "../ui/StatusMessage";

export default function AccountSection({
  authEmail,
  signInEmail,
  setSignInEmail,
  signInPassword,
  setSignInPassword,
  authLoading,
  authStatus,
  onSignIn,
  onSignOut,
}) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Account</h3>
      {authEmail ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Signed in as <span className="font-medium text-gray-900">{authEmail}</span>
          </p>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <form onSubmit={onSignIn} className="space-y-3">
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
              href="https://bid-extension-web.vercel.app/signup"
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
        <div className="mt-3">
          <StatusMessage text={authStatus.text} type={authStatus.type} />
        </div>
      )}
    </div>
  );
}
