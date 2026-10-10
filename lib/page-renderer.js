import { editionRelated } from "./ui.js";

/** Replace a caderno while retaining edited fields during partial updates. */
export function createPageRenderer({ main, getPage, motion }) {
  function captureDrafts() {
    return [...main.querySelectorAll("form[id]")].map((form) => ({
      id: form.getAttribute("id"),
      bookId: form.querySelector('[name="bookId"]')?.value || "",
      controls: [...form.elements]
        .filter((control) => {
          if (
            !control.name ||
            ["hidden", "file", "submit", "button"].includes(control.type)
          )
            return false;
          if (control.type === "checkbox" || control.type === "radio")
            return control.checked !== control.defaultChecked;
          if (control.tagName === "SELECT") {
            const initial =
              [...control.options].find((option) => option.defaultSelected) ||
              control.options[0];
            return control.value !== initial?.value;
          }
          return control.value !== control.defaultValue;
        })
        .map((control) => ({
          name: control.name,
          value: control.value,
          checked: control.checked,
          type: control.type,
        })),
    }));
  }

  function restoreDrafts(drafts) {
    for (const draft of drafts) {
      const form = document.getElementById(draft.id);
      if (
        !form ||
        !main.contains(form) ||
        (form.querySelector('[name="bookId"]')?.value || "") !== draft.bookId
      )
        continue;
      for (const saved of draft.controls) {
        const control = [...form.elements].find(
          (element) =>
            element.name === saved.name &&
            ((saved.type !== "checkbox" && saved.type !== "radio") ||
              element.value === saved.value),
        );
        if (!control) continue;
        if (saved.type === "checkbox" || saved.type === "radio")
          control.checked = saved.checked;
        else control.value = saved.value;
      }
    }
  }

  return function commitPage(html, { preserve = false, reveal = false } = {}) {
    const drafts = preserve ? captureDrafts() : [];
    const focused =
      preserve && main.contains(document.activeElement)
        ? document.activeElement
        : null;
    const focusId = focused?.getAttribute("id");
    const action =
      !focusId && focused?.dataset.action
        ? {
            name: focused.dataset.action,
            id: focused.dataset.id,
            value: focused.dataset.value,
          }
        : null;
    const selection =
      typeof focused?.selectionStart === "number"
        ? [focused.selectionStart, focused.selectionEnd]
        : null;
    main.innerHTML = html + editionRelated(getPage());
    if (preserve) restoreDrafts(drafts);
    if (focused && preserve) {
      const byId = focusId ? document.getElementById(focusId) : null;
      const replacement =
        byId && main.contains(byId)
          ? byId
          : action
            ? [...main.querySelectorAll("[data-action]")].find(
                (element) =>
                  element.dataset.action === action.name &&
                  element.dataset.id === action.id &&
                  element.dataset.value === action.value,
              )
            : null;
      if (replacement) {
        replacement.focus({ preventScroll: true });
        if (
          selection &&
          typeof replacement.selectionStart === "number" &&
          typeof replacement.setSelectionRange === "function"
        )
          replacement.setSelectionRange(...selection);
      } else if (!focused.isConnected) main.focus({ preventScroll: true });
    }
    if (reveal) motion.reveal(main);
  };
}
