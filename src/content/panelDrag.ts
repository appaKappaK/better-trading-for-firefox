interface Position {
  left: number;
  top: number;
}

interface Size {
  height: number;
  width: number;
}

type Point = {
  x: number;
  y: number;
};

export type PanelDragSurface = 'collapsed-launcher' | 'expanded-header';

const PANEL_DRAG_THRESHOLD_PX = 5;

export function clampPanelPosition(
  position: Position,
  viewport: Size,
  panel: Size,
): Position {
  return {
    left: clamp(position.left, 0, Math.max(viewport.width - panel.width, 0)),
    top: clamp(position.top, 0, Math.max(viewport.height - panel.height, 0)),
  };
}

export function hasExceededDragThreshold(start: Point, current: Point) {
  const deltaX = current.x - start.x;
  const deltaY = current.y - start.y;

  return (
    deltaX * deltaX + deltaY * deltaY >=
    PANEL_DRAG_THRESHOLD_PX * PANEL_DRAG_THRESHOLD_PX
  );
}

export function resolvePanelDragSurface(
  path: EventTarget[],
): PanelDragSurface | null {
  const elements = path.filter((target): target is Element => target instanceof Element);
  const dock = elements.find((element) =>
    element.classList.contains('btff-panel-dock'),
  );

  if (dock) {
    const blockedDockAction = elements.some(
      (element) =>
        element.matches('button, a, input, select, textarea, label') &&
        !element.classList.contains('btff-panel-dock__button'),
    );

    return blockedDockAction ? null : 'collapsed-launcher';
  }

  const inExpandedHeader = elements.some((element) =>
    element.classList.contains('btff-panel__header'),
  );
  if (!inExpandedHeader) return null;

  const inInteractiveControl = elements.some((element) =>
    element.matches('button, a, input, select, textarea, label'),
  );

  return inInteractiveControl ? null : 'expanded-header';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
