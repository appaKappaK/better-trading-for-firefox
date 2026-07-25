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

  it('shows only the nested scroll surface receiving activity', () => {
    vi.useFakeTimers();
    const shell = document.createElement('main');
    const list = document.createElement('div');
    list.dataset.transientScrollbar = 'true';
    shell.append(list);
    const cleanup = attachTransientScrollbar(shell, 700);

    list.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));

    expect(list.dataset.scrolling).toBe('true');
    expect(shell.dataset.scrolling).toBeUndefined();
    expect(list.style.scrollbarColor).toBe(
      'rgba(138, 151, 165, 0.9) transparent',
    );

    list.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(699);
    expect(list.dataset.scrolling).toBe('true');
    vi.advanceTimersByTime(1);
    expect(list.dataset.scrolling).toBeUndefined();
    expect(list.style.scrollbarColor).toBe('');

    cleanup();
  });

  it('does not reveal a scrollbar from pointer hover alone', () => {
    vi.useFakeTimers();
    const scroller = document.createElement('main');
    const cleanup = attachTransientScrollbar(scroller, 700);

    scroller.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(scroller.dataset.scrolling).toBeUndefined();

    cleanup();
  });
});
