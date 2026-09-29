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
});
