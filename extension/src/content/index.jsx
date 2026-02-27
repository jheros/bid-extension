import React from "react";
import ReactDOM from "react-dom/client";
import App from "../components/App";

// Import CSS as a raw string using Vite's ?inline query
import contentStyles from "./content.css?inline";

const INJECT_ROOT_ID = "chrome-extension-inject-root";

function injectExtension() {
  if (!document.body) return;
  if (document.getElementById(INJECT_ROOT_ID)) return;

  const root = document.createElement("div");
  root.id = INJECT_ROOT_ID;
  Object.assign(root.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "2147483647",
    isolation: "isolate",
  });
  document.body.appendChild(root);

  // Shadow DOM for full style isolation
  const shadowRoot = root.attachShadow({ mode: "open" });

  const reactRoot = document.createElement("div");
  reactRoot.id = "injected-app";
  Object.assign(reactRoot.style, {
    width: "100%",
    height: "100%",
  });
  shadowRoot.appendChild(reactRoot);

  // Inject Tailwind styles into shadow DOM only
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(contentStyles);
  shadowRoot.adoptedStyleSheets = [sheet];

  ReactDOM.createRoot(reactRoot).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// Initial injection (or once body is available)
function runWhenReady() {
  if (document.body) {
    injectExtension();
    startObserver();
  } else {
    const bodyObserver = new MutationObserver((_mutations, obs) => {
      if (document.body) {
        obs.disconnect();
        injectExtension();
        startObserver();
      }
    });
    bodyObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
}

function startObserver() {
  let rafScheduled = false;
  const observer = new MutationObserver(() => {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      if (!document.getElementById(INJECT_ROOT_ID)) {
        injectExtension();
      }
    });
  });
  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
}

runWhenReady();
