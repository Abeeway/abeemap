import {
  animateMarker,
  AnimatedMarker,
  interpolatePosition,
  MarkerPosition,
} from './marker-animation';

class FakeMarker implements AnimatedMarker {
  position: MarkerPosition;
  events: string[] = [];

  constructor(position: MarkerPosition) {
    this.position = position;
  }

  getLatLng(): { lat: number; lng: number } {
    return { lat: this.position[0], lng: this.position[1] };
  }

  setLatLng(position: MarkerPosition): void {
    this.position = position;
  }

  fire(eventName: string): void {
    this.events.push(eventName);
  }
}

describe('marker animation', () => {
  it('returns the starting position at zero progress', () => {
    expect(interpolatePosition([10, 20], [30, 40], 0)).toEqual([10, 20]);
  });

  it('returns the midpoint at half progress', () => {
    expect(interpolatePosition([10, 20], [30, 40], 0.5)).toEqual([20, 30]);
  });

  it('returns the destination at full progress', () => {
    expect(interpolatePosition([10, 20], [30, 40], 1)).toEqual([30, 40]);
  });

  it('moves a synthetic marker through the midpoint to its destination', () => {
    const marker = new FakeMarker([10, 20]);
    const activeFrames = new WeakMap<object, number>();
    let frameCallback: FrameRequestCallback | undefined;
    let nextFrameId = 0;
    const requestFrame = (callback: FrameRequestCallback) => {
      frameCallback = callback;
      return ++nextFrameId;
    };

    animateMarker(
      marker,
      [30, 40],
      2000,
      activeFrames,
      requestFrame,
      () => undefined,
      1000,
    );

    expect(marker.events).toEqual(['movestart']);
    frameCallback?.(2000);
    expect(marker.position).toEqual([20, 30]);

    frameCallback?.(3000);
    expect(marker.position).toEqual([30, 40]);
    expect(marker.events).toEqual(['movestart', 'moveend']);
    expect(activeFrames.has(marker)).toBeFalse();
  });
});
