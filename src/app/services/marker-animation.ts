export type MarkerPosition = readonly [number, number];

export interface AnimatedMarker {
  getLatLng(): { lat: number; lng: number };
  setLatLng(position: MarkerPosition): unknown;
  fire(eventName: string): unknown;
}

export type AnimationFrameRequest = (callback: FrameRequestCallback) => number;
export type AnimationFrameCancel = (handle: number) => void;

export function interpolatePosition(
  from: MarkerPosition,
  to: MarkerPosition,
  progress: number,
): [number, number] {
  const boundedProgress = Math.max(0, Math.min(progress, 1));

  return [
    from[0] + (to[0] - from[0]) * boundedProgress,
    from[1] + (to[1] - from[1]) * boundedProgress,
  ];
}

export function animateMarker(
  marker: AnimatedMarker,
  target: MarkerPosition,
  duration: number,
  activeFrames: WeakMap<object, number>,
  requestFrame: AnimationFrameRequest = requestAnimationFrame,
  cancelFrame: AnimationFrameCancel = cancelAnimationFrame,
  startedAt: number = performance.now(),
): void {
  const previousFrame = activeFrames.get(marker);
  if (previousFrame !== undefined) {
    cancelFrame(previousFrame);
  }

  const start = marker.getLatLng();
  const from: MarkerPosition = [start.lat, start.lng];

  marker.fire('movestart');

  const step = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    marker.setLatLng(interpolatePosition(from, target, progress));

    if (progress < 1) {
      activeFrames.set(marker, requestFrame(step));
    } else {
      activeFrames.delete(marker);
      marker.fire('moveend');
    }
  };

  activeFrames.set(marker, requestFrame(step));
}
