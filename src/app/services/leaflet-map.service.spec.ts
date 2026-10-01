import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject } from 'rxjs';
import * as L from 'leaflet';

import { DxLocationApiService } from './dx-location-api.service';
import { LeafletMapService } from './leaflet-map.service';
import { MqttClientService } from './mqtt-client.service';

describe('floorplan loading after map destruction', () => {
  let service: LeafletMapService;
  let http: HttpTestingController;
  let container: HTMLDivElement;
  let map: L.Map;
  let removed: boolean;

  beforeEach(() => {
    removed = false;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const dx = jasmine.createSpyObj<DxLocationApiService>('DxLocationApiService', ['getBluetoothMap']);
    dx.getBluetoothMap.and.returnValue(of({ type: 'FeatureCollection', features: [] }));
    const mqtt = { locationUpdateMessage$: new Subject() } as unknown as MqttClientService;
    const snackbar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    service = new LeafletMapService(document, TestBed.inject(Injector), TestBed.inject(HttpClient), dx, snackbar, dialog, mqtt);
    service.initialize();
    http.expectOne((request) => request.url.includes('device-names.jsonc')).flush('{}');
    container = document.createElement('div');
    document.body.appendChild(container);
    map = L.map(container);
    // Exercise real map initialization without fetching external tile images.
    spyOn(map, 'addLayer').and.returnValue(map);
    service.initMap(map);
  });

  afterEach(() => {
    if (!removed) map.remove();
    container.remove();
    void service.myAudioContext.close();
    http.verify();
  });

  it('does not update a removed map when pending floorplans arrive', () => {
    map.remove();
    removed = true;
    map.off();
    const setView = spyOn(map, 'setView').and.callThrough();
    expect(() => http.expectOne((request) => request.url.includes('floorplans.jsonc')).flush(JSON.stringify([
      { id: 'office', name: 'Office', image: 'assets/floorplan.png', bounds: [[47, 19], [48, 20]], default: true },
    ]))).not.toThrow();
    expect(setView).not.toHaveBeenCalled();
    expect(service.floorplans.length).toBe(1);
  });

  it('applies pending floorplans to a map that is still active', () => {
    const setView = spyOn(map, 'setView').and.callThrough();
    http.expectOne((request) => request.url.includes('floorplans.jsonc')).flush(JSON.stringify([
      { id: 'office', name: 'Office', image: 'assets/floorplan.png', bounds: [[47, 19], [48, 20]], default: true },
    ]));
    expect(setView).toHaveBeenCalled();
    expect(map.getCenter()).toEqual(L.latLng(47.5, 19.5));
  });
});

describe('Leaflet popup and tooltip text safety', () => {
  let service: LeafletMapService;
  let http: HttpTestingController;
  let namesRequest: TestRequest;
  let namesLoaded: boolean;
  let container: HTMLDivElement;
  let map: L.Map;
  const eui = '0011223344556677';
  const html = '<img src=x onerror="void 0"><svg onload="void 0"></svg>';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const dx = jasmine.createSpyObj<DxLocationApiService>('DxLocationApiService', ['getBluetoothMap']);
    dx.getBluetoothMap.and.returnValue(of({ type: 'FeatureCollection', features: [] }));
    const mqtt = { locationUpdateMessage$: new Subject() } as unknown as MqttClientService;
    const snackbar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    service = new LeafletMapService(document, TestBed.inject(Injector), TestBed.inject(HttpClient), dx, snackbar, dialog, mqtt);
    service.initialize();
    namesLoaded = false;
    namesRequest = http.expectOne((request) => request.url.includes('device-names.jsonc'));
    http.expectOne((request) => request.url.includes('floorplans.jsonc')).flush('[]');
    container = document.createElement('div');
    container.style.width = '300px';
    container.style.height = '300px';
    document.body.appendChild(container);
    map = L.map(container).setView([47, 19], 3);
    service.devicesFeatureGroup.addTo(map);
    service.beaconsFeatureGroup.addTo(map);
    // Popup updates are synchronous; keep marker animations from outliving tests.
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
  });

  afterEach(() => {
    if (!namesLoaded) namesRequest.flush('{}');
    map.remove();
    container.remove();
    void service.myAudioContext.close();
    http.verify();
  });

  function loadNames(name: string) {
    namesLoaded = true;
    namesRequest.flush(JSON.stringify({ [eui]: { name } }));
  }

  function expectPlainText(element: HTMLElement | undefined, text: string) {
    expect(element).toBeDefined();
    expect(element?.textContent).toContain(text);
    expect(element?.querySelector('img, svg, script, iframe')).toBeNull();
  }

  it('renders new MQTT popup fields as literal text with the existing line breaks', () => {
    service.updateDeviceMarker({ deviceEUI: html, time: html, coordinates: [19, 47], uplinkPayload: { sosFlag: 1 } });
    const marker = service.devices[html] as L.Marker;
    marker.openPopup();
    const popup = marker.getPopup()?.getElement();
    expectPlainText(popup, `DevEUI: ${html}`);
    expectPlainText(popup, `Time: ${html}`);
    expect(popup?.textContent).toContain('SOS: ACTIVE');
    expect(popup?.querySelectorAll('br').length).toBe(2);
  });

  it('keeps popup updates safe when a later MQTT message contains HTML', () => {
    service.updateDeviceMarker({ deviceEUI: eui, time: '2026-10-01T12:00:00Z', coordinates: [19, 47] });
    const marker = service.devices[eui] as L.Marker;
    marker.openPopup();
    service.updateDeviceMarker({ deviceEUI: eui, time: html, coordinates: [19, 47], uplinkPayload: { sosFlag: 0 } });
    expectPlainText(marker.getPopup()?.getElement(), `Time: ${html}`);
    expect(marker.getPopup()?.getElement()?.textContent).toContain('SOS: inactive');
  });

  it('renders configured device names as literal tooltip text', () => {
    loadNames(html);
    service.updateDeviceMarker({ deviceEUI: eui, time: '2026-10-01T12:00:00Z', coordinates: [19, 47] });
    expectPlainText((service.devices[eui] as L.Marker).getTooltip()?.getElement(), html);
  });

  it('keeps late-loaded names safe when replacing an existing device tooltip', () => {
    service.updateDeviceMarker({ deviceEUI: eui, time: '2026-10-01T12:00:00Z', coordinates: [19, 47] });
    loadNames(html);
    expectPlainText((service.devices[eui] as L.Marker).getTooltip()?.getElement(), html);
  });

  function importBeacon(name: unknown) {
    service.importFeatures({ type: 'FeatureCollection', features: [{
      type: 'Feature', geometry: { type: 'Point', coordinates: [19, 47] },
      properties: { name, mac: '00:11:22:33:44:55', id: '', floor_number: 0 },
    }] });
  }

  it('renders imported beacon names as literal tooltip text', () => {
    importBeacon(html);
    const marker = service.beaconsFeatureGroup.getLayers()[0] as L.Marker;
    expectPlainText(marker.getTooltip()?.getElement(), html);
  });

  it('keeps renamed beacon tooltips safe', () => {
    importBeacon('Office beacon');
    const marker = service.beaconsFeatureGroup.getLayers()[0] as L.Marker;
    service.updateMarker(L.Util.stamp(marker), html, '00:11:22:33:44:55', '', 0);
    expectPlainText(marker.getTooltip()?.getElement(), html);
  });

  it('rejects non-string imported names while preserving the existing beacon map', () => {
    importBeacon('Office beacon');
    const marker = service.beaconsFeatureGroup.getLayers()[0];
    importBeacon({ html });
    expect(service.beaconsFeatureGroup.getLayers()).toEqual([marker]);
  });

  it('ignores invalid MQTT display fields instead of throwing', () => {
    expect(() => {
      service.updateDeviceMarker({ deviceEUI: { html }, coordinates: [19, 47] });
      service.updateDeviceMarker({ deviceEUI: eui, time: { html }, coordinates: [19, 47] });
    }).not.toThrow();
    expect(service.devicesFeatureGroup.getLayers().length).toBe(0);
  });
});
