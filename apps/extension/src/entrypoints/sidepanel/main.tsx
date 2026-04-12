import React from "react";
import ReactDOM from "react-dom/client";
import { makePanelRuntime, RuntimeContext } from "@/lib/runtime";
import { App } from "./app";
import "./styles.css";

const runtime = makePanelRuntime();

function syncDarkMode() {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () =>
    document.documentElement.classList.toggle("dark", mq.matches);
  apply();
  mq.addEventListener("change", apply);
}

syncDarkMode();

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <RuntimeContext.Provider value={runtime}>
        <App />
      </RuntimeContext.Provider>
    </React.StrictMode>
  );
}
