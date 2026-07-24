// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  clampPanelPosition,
  hasExceededDragThreshold,
  resolvePanelDragSurface,
} from '../src/content/panelDrag';

describe('panel drag geometry', () => {
  it('keeps an already-visible overlay position unchanged', () => {
    expect(
      clampPanelPosition(
        { left: 640, top: 120 },
        { height: 900, width: 1600 },
        { height: 600, width: 320 },
      ),
    ).toEqual({ left: 640, top: 120 });
  });

  it('re-clamps a compact dock position for the expanded panel size', () => {
    expect(
      clampPanelPosition(
        { left: 1396, top: 880 },
        { height: 900, width: 1600 },
        { height: 640, width: 320 },
      ),
    ).toEqual({ left: 1280, top: 260 });
  });

  it('keeps oversized panels anchored to the viewport origin', () => {
    expect(
      clampPanelPosition(
        { left: 100, top: 100 },
        { height: 700, width: 280 },
        { height: 900, width: 320 },
      ),
    ).toEqual({ left: 0, top: 0 });
  });

  it('starts moving only after the pointer crosses the drag threshold', () => {
    expect(hasExceededDragThreshold({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(
      false,
    );
    expect(hasExceededDragThreshold({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(
      true,
    );
  });

  it('uses the launcher as a drag surface but excludes dock actions', () => {
    const dock = document.createElement('section');
    dock.className = 'btff-panel-dock';
    const launcher = document.createElement('button');
    launcher.className = 'btff-panel-dock__button';
    const launcherCopy = document.createElement('span');
    launcher.append(launcherCopy);
    dock.append(launcher);
    const jump = document.createElement('button');
    jump.className = 'btff-panel-dock__pinned-jump';
    dock.append(jump);

    expect(resolvePanelDragSurface([launcherCopy, launcher, dock])).toBe(
      'collapsed-launcher',
    );
    expect(resolvePanelDragSurface([dock])).toBe('collapsed-launcher');
    expect(resolvePanelDragSurface([jump, dock])).toBeNull();
  });
});
