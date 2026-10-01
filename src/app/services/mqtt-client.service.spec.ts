import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../auth/auth.service';
import { MqttClientService } from './mqtt-client.service';

describe('MqttClientService message processing', () => {
  let service: MqttClientService;

  beforeEach(() => {
    const authService = {
      platform: 'PREVDX',
      mqttUserName: null,
      mqttPassword: null,
      mqttTopic: null,
    } as AuthService;
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    service = new MqttClientService(authService, snackBar);
  });

  it('sanitizes and emits a valid message', () => {
    let received: any;
    service.message$.subscribe((message) => received = message);

    service.processMessage(JSON.stringify({
      deviceEUI: '0011223344556677',
      processedFeed: { private: true },
      rawPosition: { private: true },
      resolvedTracker: { private: true },
      status: 'active',
    }));

    expect(received).toEqual({
      deviceEUI: '0011223344556677',
      status: 'active',
    });
  });

  it('emits coordinate messages as location updates', () => {
    let locationUpdate: any;
    service.locationUpdateMessage$.subscribe((message) => locationUpdate = message);

    service.processMessage(JSON.stringify({
      deviceEUI: '0011223344556677',
      coordinates: [19.0402, 47.4979],
    }));

    expect(locationUpdate.coordinates).toEqual([19.0402, 47.4979]);
  });

  it('does not emit a location update without coordinates', () => {
    const locationSpy = jasmine.createSpy('location update');
    service.locationUpdateMessage$.subscribe(locationSpy);

    service.processMessage(JSON.stringify({ status: 'active' }));

    expect(locationSpy).not.toHaveBeenCalled();
  });

  it('ignores invalid JSON without terminating message processing', () => {
    const messageSpy = jasmine.createSpy('message');
    const consoleSpy = spyOn(console, 'log');
    service.message$.subscribe(messageSpy);

    expect(() => service.processMessage('{not-json')).not.toThrow();
    expect(messageSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });

  for (const coordinates of [
    [0, 47.4979], [19.0402, 0], [0, 0], [-19.0402, -47.4979],
    [-180, -90], [180, 90], [19.0402, 47.4979, 100],
  ]) {
    it(`accepts valid coordinates ${JSON.stringify(coordinates)} without reordering them`, () => {
      const location = jasmine.createSpy('location');
      service.locationUpdateMessage$.subscribe(location);
      const message = { deviceEUI: '0011223344556677', coordinates };
      service.processMessage(JSON.stringify(message));
      expect(location).toHaveBeenCalledOnceWith(message);
    });
  }

  for (const coordinates of [
    [], [19], null, '19,47', { 0: 19, 1: 47 },
    ['19', 47], [19, '47'], [true, 47], [19, null],
    [-180.01, 47], [180.01, 47], [19, -90.01], [19, 90.01],
  ]) {
    it(`keeps invalid coordinates ${JSON.stringify(coordinates)} out of the location stream`, () => {
      const location = jasmine.createSpy('location');
      const log = jasmine.createSpy('log');
      service.locationUpdateMessage$.subscribe(location);
      service.message$.subscribe(log);
      const message = { deviceEUI: '0011223344556677', coordinates };
      service.processMessage(JSON.stringify(message));
      expect(location).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledOnceWith(message);
      // A rejected location must not terminate subsequent processing.
      service.processMessage(JSON.stringify({ deviceEUI: message.deviceEUI, coordinates: [0, 0] }));
      expect(location).toHaveBeenCalledTimes(1);
    });
  }

  it('rejects numeric overflow in either coordinate', () => {
    const location = jasmine.createSpy('location');
    service.locationUpdateMessage$.subscribe(location);
    service.processMessage('{"coordinates":[1e309,47]}');
    service.processMessage('{"coordinates":[19,-1e309]}');
    expect(location).not.toHaveBeenCalled();
  });
});
