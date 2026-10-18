function fixDoctorLabel() {
  document.querySelectorAll('[data-name="PROF. BRAINE"], [data-name="PROFESSOR BRAINE"]').forEach(node => {
    node.setAttribute("data-name", "DR. JONES");
  });
}

new MutationObserver(fixDoctorLabel).observe(document.documentElement, {childList: true, subtree: true});
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fixDoctorLabel, {once: true});
else fixDoctorLabel();
