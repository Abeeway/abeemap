import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject, finalize } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { MqttClientService } from '../../services/mqtt-client.service';
import { NavigationComponent } from './navigation.component';

describe('navigation subscription ownership', () => {
  it('releases all owned subscriptions while keeping shared streams usable', () => {
    const breakpoints = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });
    const released = jasmine.createSpy('breakpoint observer released');
    const observer = jasmine.createSpyObj<BreakpointObserver>('BreakpointObserver', ['observe']);
    observer.observe.and.returnValue(breakpoints.pipe(finalize(released)));
    const auth = { loggedIn$: new BehaviorSubject(true), userId: 'user-1' } as AuthService;
    const mqtt = { connected$: new BehaviorSubject(true) } as MqttClientService;
    const component = new NavigationComponent(auth, observer, mqtt);
    component.ngOnInit();
    breakpoints.next({ matches: true, breakpoints: {} });
    expect(component.isHandset).toBeTrue();
    expect(component.userId).toBe('user-1');
    expect(component.mqttConnected).toBeTrue();

    component.ngOnDestroy();
    expect(released).toHaveBeenCalledTimes(1);
    expect(() => {
      breakpoints.next({ matches: false, breakpoints: {} });
      auth.loggedIn$.next(false);
      mqtt.connected$.next(false);
    }).not.toThrow();
    expect(component.isHandset).toBeTrue();
    expect(component.userId).toBe('user-1');
    expect(component.mqttConnected).toBeTrue();
    expect(auth.loggedIn$.closed).toBeFalse();
    expect(mqtt.connected$.closed).toBeFalse();

    const replacement = new NavigationComponent(auth, observer, mqtt);
    replacement.ngOnInit();
    expect(replacement.isHandset).toBeFalse();
    expect(replacement.userId).toBe('');
    expect(replacement.mqttConnected).toBeFalse();
    replacement.ngOnDestroy();
    expect(released).toHaveBeenCalledTimes(2);
  });

  it('lets the toggle cancel a pending connection', () => {
    const mqtt = jasmine.createSpyObj<MqttClientService>('MqttClientService', ['connect', 'disconnect'], { connectionActive: true });
    const observer = jasmine.createSpyObj<BreakpointObserver>('BreakpointObserver', ['observe']);
    observer.observe.and.returnValue(new BehaviorSubject({ matches: false, breakpoints: {} }));
    const component = new NavigationComponent({} as AuthService, observer, mqtt);
    component.mqttToggle();
    expect(mqtt.disconnect).toHaveBeenCalledTimes(1);
    expect(mqtt.connect).not.toHaveBeenCalled();
  });
});
