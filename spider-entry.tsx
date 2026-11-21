import React from "react";
import { createRoot } from "react-dom/client";
import SilkSpiderCursor from "./components/silk-spider-cursor";

const host = document.createElement("div");
// Keep the spider/web effect desktop-only: it crowds the smaller touch layout.
const mobileStyle = document.createElement("style");
mobileStyle.textContent = `@media (max-width: 760px), (pointer: coarse) { #silk-spider-root { display: none !important; } }`;
document.head.appendChild(mobileStyle);
host.id = "silk-spider-root";
host.setAttribute("aria-hidden", "true");
document.body.appendChild(host);

createRoot(host).render(
  React.createElement(SilkSpiderCursor, {
    anchorSelector: "a, h1, h2, h3, .world-row, .page-title, .photo, .game-panel, .voice-tool, .ai-feature, .section-label",
    silkColor: "#f2eee8",
    bounceColor: "#0b0b0c",
    shadowColor: "#000000",
    size: window.matchMedia("(max-width: 760px), (pointer: coarse)").matches ? 78 : 175,
    seedWebs: window.matchMedia("(max-width: 760px), (pointer: coarse)").matches ? 2 : 12,
    maxThreads: window.matchMedia("(max-width: 760px), (pointer: coarse)").matches ? 18 : 85,
    maxDpr: window.matchMedia("(max-width: 760px)").matches ? 1.5 : 2,
    zIndex: 20,
    fly: !window.matchMedia("(max-width: 760px), (pointer: coarse)").matches,
    enter: true
  })
);
