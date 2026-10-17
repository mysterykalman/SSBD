// Player-facing gameplay must never render developer diagnostics.
// Diagnostic capture continues in the background and is reviewed only on /review.
const style = document.createElement("style");
style.id = "ssbdHidePlayerDiagnostics";
style.textContent = `
  .gary-debug,
  [data-developer-diagnostics],
  .developer-diagnostics,
  .debug-panel,
  .diagnostics-panel {
    display: none !important;
  }
`;
document.head.append(style);
