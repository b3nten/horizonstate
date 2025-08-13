import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./main.css";
import { AppRoot } from "./app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
);
