function fixProfessorLabel() {
  document.querySelectorAll('[data-name="PROF. BRAINE"]').forEach(node => {
    node.setAttribute("data-name", "PROFESSOR BRAINE");
  });
}

new MutationObserver(fixProfessorLabel).observe(document.documentElement, {childList: true, subtree: true});
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fixProfessorLabel, {once: true});
else fixProfessorLabel();
