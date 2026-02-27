export default function SetupGuide() {
  return (
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
  );
}
