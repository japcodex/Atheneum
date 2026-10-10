import { $, esc } from "./ui.js";

export function createFeedback(modal) {
  let timer;
  function toast(message, undo) {
    clearTimeout(timer);
    const element = $("#toast");
    element.innerHTML =
      esc(message) +
      (undo ? '<button data-action="undo-delete">Desfazer</button>' : "");
    if (undo) element.dataset.undo = undo;
    element.classList.add("visible");
    timer = setTimeout(
      () => element.classList.remove("visible"),
      undo ? 9000 : 5500,
    );
  }
  function fail(error, scope = modal) {
    if (error.errors) {
      for (const [field, message] of Object.entries(error.errors)) {
        const target = [...scope.querySelectorAll("[data-error]")].find(
          (element) => element.dataset.error === field,
        );
        if (target) target.textContent = message;
      }
      scope
        .querySelector("[data-error]:not(:empty)")
        ?.previousElementSibling?.focus();
    }
    toast(
      error.message || "Não foi possível salvar. Seus dados foram mantidos.",
    );
  }
  function act(callback, message) {
    try {
      const result = callback();
      if (message) toast(message);
      return result;
    } catch (error) {
      fail(error);
      return null;
    }
  }
  return {
    toast,
    fail,
    act,
    dispose() {
      clearTimeout(timer);
    },
  };
}
