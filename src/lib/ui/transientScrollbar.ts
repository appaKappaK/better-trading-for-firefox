const TRANSIENT_SCROLLBAR_SELECTOR = '[data-transient-scrollbar="true"]';
const ACTIVE_SCROLLBAR_COLOR = 'rgba(138, 151, 165, 0.9) transparent';

export function attachTransientScrollbar(
  root: HTMLElement,
  hideDelayMs = 700,
) {
  const hideTimers = new Map<HTMLElement, number>();

  const resolveScrollSurface = (event: Event) => {
    const eventTarget = event.target;
    if (eventTarget instanceof Element) {
      const nestedSurface = eventTarget.closest<HTMLElement>(
        TRANSIENT_SCROLLBAR_SELECTOR,
      );
      if (nestedSurface && root.contains(nestedSurface)) return nestedSurface;
    }

    return root;
  };

  const showScrollbar = (event: Event) => {
    const scrollSurface = resolveScrollSurface(event);
    const existingTimer = hideTimers.get(scrollSurface);

    scrollSurface.dataset.scrolling = 'true';
    scrollSurface.style.setProperty('scrollbar-color', ACTIVE_SCROLLBAR_COLOR);
    if (existingTimer !== undefined) window.clearTimeout(existingTimer);

    hideTimers.set(
      scrollSurface,
      window.setTimeout(() => {
        delete scrollSurface.dataset.scrolling;
        scrollSurface.style.removeProperty('scrollbar-color');
        hideTimers.delete(scrollSurface);
      }, hideDelayMs),
    );
  };

  root.addEventListener('wheel', showScrollbar, { passive: true });
  root.addEventListener('scroll', showScrollbar, true);

  return () => {
    root.removeEventListener('wheel', showScrollbar);
    root.removeEventListener('scroll', showScrollbar, true);

    for (const [scrollSurface, hideTimer] of hideTimers) {
      window.clearTimeout(hideTimer);
      delete scrollSurface.dataset.scrolling;
      scrollSurface.style.removeProperty('scrollbar-color');
    }
    hideTimers.clear();
  };
}
