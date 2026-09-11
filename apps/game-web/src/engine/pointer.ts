export type PointerSample = {
  dragging: boolean;
  dx: number;
  dy: number;
  wheel: number;
  tapNdc: { x: number; y: number } | null;
};

export function attachPointer(canvas: HTMLCanvasElement): { sample: () => PointerSample; dispose: () => void } {
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let accX = 0;
  let accY = 0;
  let wheel = 0;
  let tapNdc: { x: number; y: number } | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch0 = 0;

  const ndc = (event: PointerEvent | MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    return { x, y };
  };

  const down = (event: PointerEvent) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      dragging = true;
      moved = false;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    } else if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const a = pts[0];
      const b = pts[1];
      if (a && b) pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const move = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const a = pts[0];
      const b = pts[1];
      if (!a || !b || pinch0 <= 1) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      wheel += Math.log(pinch0 / dist);
      pinch0 = dist;
      moved = true;
      return;
    }
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    if (Math.hypot(dx, dy) > 3) moved = true;
    accX += dx;
    accY += dy;
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const up = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (pointers.size === 0 && dragging) {
      dragging = false;
      if (!moved) tapNdc = ndc(event);
    }
    if (pointers.size < 2) pinch0 = 0;
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    wheel += event.deltaY * 0.0015;
  };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return {
    sample: () => {
      const out: PointerSample = {
        dragging,
        dx: accX,
        dy: accY,
        wheel,
        tapNdc,
      };
      accX = 0;
      accY = 0;
      wheel = 0;
      tapNdc = null;
      return out;
    },
    dispose: () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('wheel', onWheel);
      pointers.clear();
    },
  };
}
