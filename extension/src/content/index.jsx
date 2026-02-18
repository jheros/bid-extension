import React from "react";
import ReactDOM from "react-dom/client";
import App from "../components/App";
import contentCss from "./content.css?inline";

// Create a container for our React app
const root = document.createElement("div");
root.id = "chrome-extension-inject-root";
root.style.position = "fixed";
root.style.top = "0";
root.style.left = "0";
root.style.width = "100vw";
root.style.height = "100vh";
root.style.pointerEvents = "none";
root.style.zIndex = "2147483647";
root.style.isolation = "isolate";
document.body.appendChild(root);

// Shadow DOM for style isolation from the host page
const shadowRoot = root.attachShadow({ mode: "open" });

// Inject styles into shadow DOM
const style = document.createElement("style");
style.textContent = contentCss;
shadowRoot.appendChild(style);

// Container for React
const reactRoot = document.createElement("div");
reactRoot.id = "injected-app";
reactRoot.style.width = "100%";
reactRoot.style.height = "100%";
shadowRoot.appendChild(reactRoot);

ReactDOM.createRoot(reactRoot).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
