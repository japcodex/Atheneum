/**
 * Newspaper motion: independent of routes, templates and library state.
 * The document stays readable without JavaScript or the Web Animations API.
 */
import { createPaper, coverPaper, crumplePaper } from "./motion/paper.js";

const REVEAL_SELECTOR = [
  "[data-reveal]",
  ".hero-intro > .eyebrow",
  ".hero-intro h1",
  ".hero-intro > p",
  ".hero-intro > .primary-button",
  ".hero-art",
  ".quote-block",
  ".journey-preview",
  ".page-title > div > .eyebrow",
  ".page-title h1",
  ".page-title p",
  ".section-heading",
  ".editorial-card",
  ".book-card",
  ".stat",
  ".achievement",
  ".level-block",
  ".goal-block",
  ".timeline-item",
  ".empty-state",
  ".reader-placeholder",
  ".reader-sidebar",
  ".home-manifesto",
  ".edition-linked",
  ".desk-links",
  ".newspaper-stamp",
  ".paper-ribbon",
  ".modal-header",
  ".detail-cover",
  ".detail-info > h2",
  ".detail-section",
  ".preferences-row",
].join(",");

const EASE = "cubic-bezier(.22,.75,.2,1)";

function animationDone(animation) {
  return animation.finished.catch(() => undefined);
}

/**
 * transition(callback, {focus}) commits the newest route under a paper cover.
 * It resolves false when a newer navigation supersedes it. reveal(root) can
 * also be called after partial renders or after opening a dialog.
 */
export function createMotion({
  main = document.querySelector("main"),
  nav = document.querySelector("nav"),
  getPreference = () => "system",
  onPreferenceChange = () => {},
} = {}) {
  const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const canAnimate =
    typeof Element !== "undefined" &&
    typeof Element.prototype.animate === "function";
  const seen = new WeakSet();
  const watched = new Set();
  const reveals = new Map();
  let disposed = false;
  let generation = 0;
  let active = null;

  const reducedByPreference = () =>
    getPreference() === "reduced" ||
    (getPreference() !== "full" && preference?.matches);
  const shouldReduce = () =>
    disposed || !canAnimate || reducedByPreference() || document.hidden;

  function finishReveal(element) {
    const animation = reveals.get(element);
    if (animation) {
      animation.cancel();
      reveals.delete(element);
    }
    element.classList.remove("is-revealing");
  }

  function showElement(element) {
    watched.delete(element);
    observer?.unobserve(element);
    if (!element.isConnected || seen.has(element) || shouldReduce()) return;
    seen.add(element);
    const heading = element.matches("h1,h2,.section-heading,.modal-header");
    const art = element.matches(".hero-art,.detail-cover");
    const delay = Math.min(180, Number(element.dataset.revealOrder || 0) * 42);
    const existingTransform = getComputedStyle(element).transform;
    const restingTransform =
      existingTransform === "none" ? "" : existingTransform;
    element.classList.add("is-revealing");
    const frames = heading
      ? [
          {
            opacity: 0.5,
            transform: `translate3d(0,10px,0) ${restingTransform}`,
          },
          {
            opacity: 1,
            transform: `translate3d(0,0,0) ${restingTransform}`,
          },
        ]
      : [
          {
            opacity: 0.62,
            transform: `translate3d(0,${art ? 12 : 8}px,0) ${restingTransform}`,
          },
          { opacity: 1, transform: `translate3d(0,0,0) ${restingTransform}` },
        ];
    const animation = element.animate(frames, {
      duration: heading ? 740 : 620,
      delay,
      easing: EASE,
      fill: "backwards",
    });
    reveals.set(element, animation);
    animation.finished
      .then(() => {
        if (reveals.get(element) === animation) finishReveal(element);
      })
      .catch(() => {
        if (reveals.get(element) === animation) finishReveal(element);
      });
  }

  const observer =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) showElement(entry.target);
            });
          },
          { threshold: 0.08, rootMargin: "0px 0px -18px 0px" },
        )
      : null;

  function clearDetached() {
    watched.forEach((element) => {
      if (!element.isConnected) {
        observer?.unobserve(element);
        watched.delete(element);
      }
    });
    reveals.forEach((animation, element) => {
      if (!element.isConnected) finishReveal(element);
    });
  }

  function reveal(root = main) {
    clearDetached();
    // Route text must wait until its newspaper cover has been withdrawn.
    // Other surfaces, such as a dialog, can still reveal independently.
    if (!root || shouldReduce() || (active && root === main)) return;
    const targets = [...root.querySelectorAll(REVEAL_SELECTOR)];
    const selected = new Set(targets);
    let order = 0;
    targets.forEach((element) => {
      // Revealing a card or section already reveals all of its text. This
      // avoids nested transforms and keeps headings and controls together.
      let parent = element.parentElement;
      while (parent && parent !== root) {
        if (selected.has(parent)) return;
        parent = parent.parentElement;
      }
      if (
        seen.has(element) ||
        watched.has(element) ||
        element.closest("[data-no-motion]")
      )
        return;
      element.dataset.revealOrder = String(order++ % 5);
      if (observer) {
        watched.add(element);
        observer.observe(element);
      } else {
        // No observer: animate only what is already visible, leave the rest
        // readable, and never depend on a hidden CSS starting state.
        const box = element.getBoundingClientRect();
        if (box.bottom > 0 && box.top < window.innerHeight)
          showElement(element);
      }
    });
  }

  function cleanOperation(operation) {
    operation.animations.forEach((animation) => animation.cancel());
    operation.overlay?.remove();
    if (active === operation) {
      active = null;
      if (main) main.inert = operation.originalInert;
      nav?.classList.remove("is-turning-page");
      if (main && operation.originalBusy === null)
        main.removeAttribute("aria-busy");
      else if (main) main.setAttribute("aria-busy", operation.originalBusy);
    }
  }

  function stopReveals() {
    reveals.forEach((animation, element) => finishReveal(element));
  }

  function focusMain(focus) {
    if (focus && main?.isConnected) main.focus({ preventScroll: true });
  }

  async function transition(renderCallback, { focus = false } = {}) {
    if (typeof renderCallback !== "function")
      throw new TypeError("A render callback is required.");
    const ticket = ++generation;
    if (active) cleanOperation(active);
    stopReveals();
    if (shouldReduce()) {
      renderCallback();
      focusMain(focus);
      reveal();
      return true;
    }

    const paper = createPaper(document);
    const operation = {
      ...paper,
      animations: [],
      originalBusy: main?.getAttribute("aria-busy") ?? null,
      originalInert: main?.inert || false,
    };
    active = operation;
    main?.setAttribute("aria-busy", "true");
    if (main) main.inert = true;
    nav?.classList.add("is-turning-page");
    document.body.append(paper.overlay);
    let committed = false;

    try {
      const cover = coverPaper(paper);
      operation.animations.push(cover);
      await animationDone(cover);
      if (ticket !== generation || disposed) return false;

      renderCallback();
      committed = true;
      if (shouldReduce()) return true;

      cover.cancel();
      const { folds, gathering } = crumplePaper(paper);
      // Consume every cancellation promise: fast navigation may interrupt
      // any fold, and only the newest operation may reveal or focus a page.
      folds.forEach((animation) => void animationDone(animation));
      operation.animations.push(...folds, gathering);
      await animationDone(gathering);
      return ticket === generation;
    } finally {
      cleanOperation(operation);
      if (ticket === generation && !disposed && committed) {
        reveal();
        focusMain(focus);
      }
      clearDetached();
    }
  }

  function cancel() {
    generation += 1;
    if (active) cleanOperation(active);
    stopReveals();
    observer?.disconnect();
    watched.clear();
  }

  function onVisibility() {
    document.body.classList.toggle("is-page-hidden", document.hidden);
    if (!document.hidden) {
      reveal();
      return;
    }
    stopReveals();
    observer?.disconnect();
    watched.clear();
    // Finish instead of pausing the cover so route state is still committed
    // promptly when a tab is backgrounded during navigation.
    active?.animations.forEach((animation) => {
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    });
  }

  function onPreference() {
    document.body.classList.toggle("motion-full", getPreference() === "full");
    document.body.classList.toggle(
      "motion-reduced",
      getPreference() === "reduced",
    );
    onPreferenceChange({
      reduced: Boolean(reducedByPreference() || !canAnimate),
      mode: getPreference(),
    });
    if (reducedByPreference()) {
      stopReveals();
      observer?.disconnect();
      watched.clear();
      active?.animations.forEach((animation) => {
        try {
          animation.finish();
        } catch {
          animation.cancel();
        }
      });
    } else reveal();
  }

  function dispose() {
    if (disposed) return;
    cancel();
    disposed = true;
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    preference?.removeEventListener?.("change", onPreference);
    document.body.classList.remove(
      "is-page-hidden",
      "motion-full",
      "motion-reduced",
    );
  }

  function onPageHide(event) {
    if (event.persisted) cancel();
    else dispose();
  }

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  preference?.addEventListener?.("change", onPreference);
  document.body.classList.toggle("is-page-hidden", document.hidden);
  onPreference();

  return {
    transition,
    navigate: transition,
    reveal,
    cancel,
    dispose,
    refreshPreference: onPreference,
    isReduced: shouldReduce,
  };
}
