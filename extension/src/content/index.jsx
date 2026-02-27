import React from "react";
import ReactDOM from "react-dom/client";
import App from "../components/App";

// Import CSS as a raw string using Vite's ?inline query
import contentStyles from "./content.css?inline";

const root = document.createElement("div");
root.id = "chrome-extension-inject-root";
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

// Container for React

ReactDOM.createRoot(reactRoot).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
