// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { attachTransientScrollbar } from '../entrypoints/popup/App';

describe('popup scrollbar visibility', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the reserved scrollbar only during wheel activity', () => {
    vi.useFakeTimers();
    const scroller = document.createElement('main');
    const cleanup = attachTransientScrollbar(scroller, 700);

    scroller.dispatchEvent(new WheelEvent('wheel'));
    expect(scroller.dataset.scrolling).toBe('true');

    vi.advanceTimersByTime(699);
    expect(scroller.dataset.scrolling).toBe('true');
    vi.advanceTimersByTime(1);
    expect(scroller.dataset.scrolling).toBeUndefined();

    cleanup();
  });
});
