"use strict";

// History of validation errors from failed submission attempts.
// Entries hold only the field name and a description of the error,
// never the user's name, email, or message text.
const form_errors = [];

(function () {
  const form = document.querySelector('form[action="https://httpbin.org/post"]');
  if (!form) {
    return;
  }

  const fields = Array.from(form.querySelectorAll("input[required], textarea[required]"));
  const comments = form.querySelector("#comments");
  const messages = document.getElementById("messages");
  const errorList = document.getElementById("error-list");
  const errorNone = document.getElementById("error-none");
  const charCount = document.getElementById("char-count");
  const lengthStatus = document.getElementById("length-status");
  const submitButton = form.querySelector('button[type="submit"]');

  const WARN_AT = 100; // warn when this many characters (or fewer) remain

  const baseDescribedBy = new Map(); // each field's non-error aria-describedby ids
  const edited = new Set();          // fields the user has typed in
  const showing = new Set();         // fields whose error is currently displayed
  const seenThisAttempt = new Set(); // fields already logged in this failed attempt
  let attempt = 0;
  let attemptOpen = false;

  // Specific guidance for each field and problem.
  const MESSAGES = {
    name: {
      valueMissing: () => "Enter your name. This field is required."
    },
    email: {
      valueMissing: () => "Enter your email address. This field is required.",
      typeMismatch: () => "The email format is not valid. Use the format name@example.com, with text before and after the @ sign."
    },
    comments: {
      valueMissing: (f) => "Enter your comments. This field is required and needs at least " + f.minLength + " characters.",
      tooShort: (f) => "Comments must be at least " + f.minLength + " characters. Keep typing to add more."
    }
  };

  function getProblem(field) {
    const v = field.validity;
    const set = MESSAGES[field.name] || {};
    if (v.valueMissing && set.valueMissing) {
      return { type: "valueMissing", message: set.valueMissing(field) };
    }
    if (v.typeMismatch && set.typeMismatch) {
      return { type: "typeMismatch", message: set.typeMismatch(field) };
    }
    if (v.tooShort && set.tooShort) {
      return { type: "tooShort", message: set.tooShort(field) };
    }
    return null;
  }

  // Clear any old custom message, then set a fresh one only if still invalid.
  function check(field) {
    field.setCustomValidity("");
    const problem = getProblem(field);
    if (problem) {
      field.setCustomValidity(problem.message);
    }
    return problem;
  }

  function labelText(field) {
    const label = field.labels && field.labels[0];
    return label ? label.textContent.replace(/\s*\(required\)\s*/i, "") : field.name;
  }

  function setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  // Show, update, or remove the in-page error for one field.
  function render(field, problem) {
    const id = "error-" + field.id;
    let item = document.getElementById(id);
    const base = baseDescribedBy.get(field);

    if (problem) {
      if (!item) {
        item = document.createElement("li");
        item.id = id;
        item.append(document.createElement("strong"), document.createElement("span"));
        errorList.append(item);
      }
      setText(item.firstChild, labelText(field) + ": ");
      setText(item.lastChild, problem.message);
      field.setAttribute("aria-describedby", (base + " " + id).trim());
      field.setAttribute("aria-invalid", "true");
      showing.add(field);
    } else {
      if (item) {
        item.remove();
      }
      field.setAttribute("aria-describedby", base);
      field.removeAttribute("aria-invalid");
      showing.delete(field);
    }
    errorNone.hidden = errorList.children.length > 0;
  }

  // Runs only when a submission attempt is blocked by native validation.
  function onInvalid(event) {
    const field = event.target;
    if (!attemptOpen) {
      attempt += 1;
      attemptOpen = true;
      seenThisAttempt.clear();
      setTimeout(function () { attemptOpen = false; }, 0);
    }

    const problem = check(field);
    if (!problem) {
      return;
    }
    render(field, problem);

    if (!seenThisAttempt.has(field)) {
      seenThisAttempt.add(field);
      form_errors.push({
        field: field.name,
        error: problem.message,
        type: problem.type,
        attempt: attempt
      });
    }
  }

  // Remaining-character count and length status.
  function updateCount() {
    const max = comments.maxLength;
    if (max < 0) {
      return;
    }
    const remaining = Math.max(0, max - comments.value.length);
    const limitText = max.toLocaleString("en-US");
    setText(charCount, remaining.toLocaleString("en-US") + " of " + limitText + " characters remaining");

    let state = "";
    let text = "No length warning.";
    if (remaining === 0) {
      state = "is-limit";
      text = "Limit reached: comments cannot be longer than " + limitText + " characters.";
    } else if (remaining <= WARN_AT) {
      state = "is-warning";
      text = "Warning: " + WARN_AT + " or fewer characters remain.";
    }
    lengthStatus.className = state;
    setText(lengthStatus, text);
  }

  // Wire up the fields.
  fields.forEach(function (field) {
    let base = field.getAttribute("aria-describedby") || "";
    if (field === comments) {
      base = (base + " char-count").trim();
      field.setAttribute("aria-describedby", base);
    }
    baseDescribedBy.set(field, base);

    field.addEventListener("input", function () {
      edited.add(field);
      const problem = check(field);
      if (showing.has(field)) {
        render(field, problem); // update or remove a displayed error as it is fixed
      }
    });

    field.addEventListener("blur", function () {
      if (edited.has(field)) {
        render(field, check(field));
      }
    });

    field.addEventListener("invalid", onInvalid);
  });

  // Set specific messages before the browser validates, so its own
  // message bubble uses them. Covers mouse and keyboard submission.
  submitButton.addEventListener("click", function () {
    fields.forEach(function (field) { check(field); });
  });

  // The submit event fires only when the form is valid.
  form.addEventListener("submit", function (event) {
    const stillInvalid = fields.some(function (field) { return check(field) !== null; });
    if (stillInvalid) {
      event.preventDefault();
      return;
    }
    let hidden = form.querySelector('input[name="form-errors"]');
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "form-errors";
      form.append(hidden);
    }
    hidden.value = JSON.stringify(form_errors);
  });

  comments.addEventListener("input", updateCount);
  window.addEventListener("pageshow", updateCount);

  messages.hidden = false;
  updateCount();
})();