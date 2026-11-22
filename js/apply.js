// =====================================================================
// js/apply.js — accessible validation for the Apply page (Day 24 bonus)
// Written by Claude as part of the Day 24 reference solution.
//
// PROGRESSIVE ENHANCEMENT: without JavaScript the form still works as plain
// HTML (browser validation + POST). With JavaScript we:
//   - replace the browser's bubbles with messages under each field
//     (aria-invalid + aria-describedby, so screen readers read them)
//   - show a focusable error summary at the top after a failed submit
//   - re-check fields live, but only AFTER the first submit attempt
//   - on success, show a thank-you message instead of posting, because
//     this static GitHub Pages site has no /api/applications backend yet
//     (the Spring Boot phase will build it).
// =====================================================================

const form = document.querySelector("main form");

if (form) {
  form.noValidate = true;                               // keep the RULES, drop the bubbles

  // Every control we validate needs an id (aria-describedby points at "<id>-error").
  // The confirm checkbox has none in the HTML, so give it one.
  const confirmBox = form.elements.confirmDetails;
  if (confirmBox && !confirmBox.id) confirmBox.id = "confirmDetails";

  // Where messages and the summary go
  const summarySlot = document.createElement("div");
  form.prepend(summarySlot);
  const status = document.createElement("p");
  status.className = "form-status";
  status.setAttribute("role", "status");                // announced politely by screen readers
  form.append(status);

  // ---------- messages ----------
  const labelFor = control =>
    form.querySelector(`label[for="${control.id}"]`)?.textContent.replace(/\(.*?\)|:/g, "").trim()
    ?? control.closest("label")?.textContent.trim()
    ?? control.name;

  function messageFor(control) {
    const v = control.validity;
    const label = labelFor(control);
    if (v.valid) return "";
    if (v.valueMissing) {
      if (control.type === "checkbox") return "Please confirm your details are correct";
      if (control.type === "file") return "Please attach your resume";
      return `${label} is required`;
    }
    if (v.typeMismatch) return control.type === "email" ? "Enter an email like name@example.com" : "Enter a full link starting with https://";
    if (v.patternMismatch) return control.title || "Use the requested format";
    if (v.tooShort) return `${label} needs at least ${control.minLength} characters (you have ${control.value.length})`;
    if (v.rangeUnderflow || v.rangeOverflow) return `Enter a number${control.max ? ` from ${control.min} to ${control.max}` : ` of at least ${control.min}`}`;
    if (v.stepMismatch) return "Use at most one decimal place";
    if (v.badInput) return "Enter a number";
    return control.validationMessage;
  }

  function showError(control, message) {
    const id = `${control.id}-error`;
    let error = document.getElementById(id);
    if (!error) {
      error = document.createElement("p");
      error.className = "field-error";
      error.id = id;
      // a checkbox sits inside its <label>, so put the message after the label instead
      (control.type === "checkbox" ? control.closest("label") : control).after(error);
    }
    error.textContent = message;
    if (message) {
      control.setAttribute("aria-invalid", "true");
      control.setAttribute("aria-describedby", id);
    } else {
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
    }
  }

  // Only controls with an id are validated one by one (radios/skills are optional groups).
  const fields = () => [...form.elements].filter(c => c.id && c.name && !c.disabled && c.willValidate);

  function validateAll() {
    const problems = [];
    for (const control of fields()) {
      const message = messageFor(control);
      showError(control, message);
      if (message) problems.push({ control, message });
    }
    return problems;
  }

  function renderSummary(problems) {
    if (problems.length === 0) { summarySlot.replaceChildren(); return; }
    const box = document.createElement("div");
    box.className = "error-summary";
    box.setAttribute("role", "alert");
    box.tabIndex = -1;
    const heading = document.createElement("h2");
    heading.textContent = `Please fix ${problems.length} ${problems.length === 1 ? "problem" : "problems"}`;
    const list = document.createElement("ul");
    for (const { control, message } of problems) {
      const link = document.createElement("a");
      link.href = `#${control.id}`;
      link.textContent = message;
      link.addEventListener("click", event => { event.preventDefault(); control.focus(); });
      const item = document.createElement("li");
      item.append(link);
      list.append(item);
    }
    box.append(heading, list);
    summarySlot.replaceChildren(box);
    box.focus();
  }

  // ---------- submit flow ----------
  let attempted = false;

  form.addEventListener("submit", event => {
    event.preventDefault();                              // no backend on GitHub Pages
    status.textContent = "";

    // "Save draft" has formnovalidate: skip validation, keep the data in this browser only.
    if (event.submitter?.value === "draft") {
      const draft = Object.fromEntries([...new FormData(form)].filter(([, v]) => typeof v === "string"));
      try { localStorage.setItem("applicationDraft", JSON.stringify(draft)); } catch { /* storage blocked */ }
      status.textContent = "Draft saved on this device.";
      return;
    }

    attempted = true;
    const problems = validateAll();
    renderSummary(problems);
    if (problems.length > 0) return;

    const name = form.elements.fullName.value.trim().split(/\s+/)[0];
    status.textContent = `Thanks ${name}! This is a demo, so nothing was sent yet. Please email me instead.`;
    form.reset();                                         // the "reset" listener below clears the errors
  });

  // live re-check after the first attempt (one delegated listener for every field)
  const recheck = event => {
    if (attempted && event.target.id && event.target.willValidate) showError(event.target, messageFor(event.target));
  };
  form.addEventListener("input", recheck);
  form.addEventListener("change", recheck);              // checkboxes, selects, file inputs

  form.addEventListener("reset", () => {
    setTimeout(() => {                                   // reset restores values AFTER this event
      fields().forEach(control => showError(control, ""));
      summarySlot.replaceChildren();
      attempted = false;
    });
  });

  // Restore a saved draft (text fields only — files can't be restored for security reasons)
  try {
    const draft = JSON.parse(localStorage.getItem("applicationDraft") ?? "null");
    if (draft) {
      for (const [name, value] of Object.entries(draft)) {
        const control = form.elements[name];
        if (control && "value" in control && control.type !== "checkbox" && control.type !== "radio" && control.type !== "file") control.value = value;
      }
    }
  } catch { /* corrupt or blocked storage: ignore */ }
}
