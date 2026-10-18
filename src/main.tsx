import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import App from "./App";
import { initPersistence } from "./platform/persist";

initPersistence();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
