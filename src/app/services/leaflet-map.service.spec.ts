import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
