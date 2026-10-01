import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MatDialog } from '@angular/material/dialog';
import * as L from 'leaflet';

import { LeafletMapService } from '../../services/leaflet-map.service';
import { BluetoothMapComponent } from '../bluetooth-map/bluetooth-map.component';
import { MapComponent } from './map.component';

@Component({ standalone: true, template: '' })
class EmptyComponent {}

describe('map view lifecycle', () => {
  let service: jasmine.SpyObj<LeafletMapService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    service = jasmine.createSpyObj<LeafletMapService>('LeafletMapService', ['initialize', 'initMap', 'initBluetoothMap']);
    service.initMap.and.callFake((map: L.Map) => map.setView([0, 0], 3));
    service.initBluetoothMap.and.callFake((map: L.Map) => map.setView([0, 0], 3));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    const template = '<div id="map" #mapContainer style="height: 300px; width: 300px"></div>';
    TestBed.configureTestingModule({ providers: [
      provideRouter([
        { path: 'map', component: MapComponent },
        { path: 'bluetooth-map', component: BluetoothMapComponent },
        { path: 'home', component: EmptyComponent },
      ]),
      { provide: LeafletMapService, useValue: service },
      { provide: MatDialog, useValue: dialog },
    ] });
    TestBed.overrideComponent(MapComponent, { set: { template, imports: [] } });
    TestBed.overrideComponent(BluetoothMapComponent, { set: { template, imports: [] } });
  });

  it('can destroy either component before map initialization', () => {
    expect(() => new MapComponent(service).ngOnDestroy()).not.toThrow();
    expect(() => new BluetoothMapComponent(service, dialog).ngOnDestroy()).not.toThrow();
    expect(service.initMap).not.toHaveBeenCalled();
    expect(service.initBluetoothMap).not.toHaveBeenCalled();
  });

  it('initializes each view immediately and disposes its map on repeated quick route changes', async () => {
    const harness = await RouterTestingHarness.create();
    for (let i = 0; i < 3; i++) {
      await harness.navigateByUrl('/map', MapComponent);
      expect(service.initMap).toHaveBeenCalledTimes(i + 1);
      const map = service.initMap.calls.mostRecent().args[0] as L.Map;
      const mapUnload = jasmine.createSpy('map unload');
      map.once('unload', mapUnload);

      await harness.navigateByUrl('/bluetooth-map', BluetoothMapComponent);
      expect(mapUnload).toHaveBeenCalledTimes(1);
      expect(service.initBluetoothMap).toHaveBeenCalledTimes(i + 1);
      const bluetoothMap = service.initBluetoothMap.calls.mostRecent().args[0] as L.Map;
      const bluetoothUnload = jasmine.createSpy('Bluetooth map unload');
      bluetoothMap.once('unload', bluetoothUnload);

      await harness.navigateByUrl('/home', EmptyComponent);
      expect(bluetoothUnload).toHaveBeenCalledTimes(1);
    }
  });

  it('uses its own view element even if another element has the same map ID', async () => {
    const other = document.createElement('div');
    other.id = 'map';
    document.body.appendChild(other);
    try {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/map', MapComponent);
      const map = service.initMap.calls.mostRecent().args[0] as L.Map;
      expect(harness.routeNativeElement?.querySelector('#map')).toBe(map.getContainer());
      expect(other.querySelector('.leaflet-map-pane')).toBeNull();
    } finally {
      other.remove();
    }
  });
});
