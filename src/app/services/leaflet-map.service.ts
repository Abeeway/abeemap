import { DOCUMENT, Inject, Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { createCustomElement, NgElement, WithProperties } from '@angular/elements';
import { MatSnackBar} from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TextareaDialogComponent } from '../components/textarea-dialog/textarea-dialog.component'
import { DxLocationApiService } from './dx-location-api.service';
import { getApiErrorMessage, isAuthenticationError } from './service-utils.service';

import { MqttClientService } from './mqtt-client.service';
import { animateMarker } from './marker-animation';

import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { parse, ParseError, printParseErrorCode } from 'jsonc-parser';




import { BeaconSettingsPopupComponent } from '../components/beacon-settings-popup/beacon-settings-popup.component';
// import { createInjectableDefinitionMap } from '@angular/compiler/src/render3/partial/injectable';

// import { MqttClientService } from './mqtt-client.service';




interface DeviceName {
  name: string;
}

type DeviceNames = Record<string, DeviceName>;

export interface FloorplanConfig {
  id: string;
  name: string;
  image: string;
  bounds: [[number, number], [number, number]];
  zoom?: number;
  default?: boolean;
}


const DEFAULT_ZOOM_LEVEL = 19;

const ICONS_FOLDER = './assets/';

const ICON_BLE_BEACON = L.icon({
  // iconRetinaUrl: ICONS_FOLDER + 'bluetooth.png',
  iconUrl: ICONS_FOLDER + 'bluetooth.png',
  shadowUrl: ICONS_FOLDER + 'bluetooth-shadow.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -15],
  tooltipAnchor: [0, 16],
  shadowSize: [30, 20],
  shadowAnchor: [10, 20]
});

const ICON_PERSON = L.icon({
  iconRetinaUrl: ICONS_FOLDER + 'marker-icon-person-2x.png',
  iconUrl: ICONS_FOLDER + 'marker-icon-person-1x.png',
  shadowUrl: ICONS_FOLDER + 'marker-icon-person-shadow.png',
  iconSize: [24, 33],
  iconAnchor: [12, 33],
  popupAnchor: [1, -24],
  tooltipAnchor: [0, 6],
  shadowSize: [36, 33],
  shadowAnchor: [12, 33],
});

const ICON_PERSON_YELLOW = L.icon({
  iconRetinaUrl: ICONS_FOLDER + 'marker-icon-person-yellow-2x.png',
  iconUrl: ICONS_FOLDER + 'marker-icon-person-yellow-1x.png',
  shadowUrl: ICONS_FOLDER + 'marker-icon-person-shadow.png',
  iconSize: [24, 33],
  iconAnchor: [12, 33],
  popupAnchor: [1, -24],
  tooltipAnchor: [0, 6],
  shadowSize: [36, 33],
  shadowAnchor: [12, 33],
});

const ICON_PERSON_GREY = L.icon({
  iconRetinaUrl: ICONS_FOLDER + 'marker-icon-person-grey-2x.png',
  iconUrl: ICONS_FOLDER + 'marker-icon-person-grey-1x.png',
  shadowUrl: ICONS_FOLDER + 'marker-icon-person-shadow.png',
  iconSize: [24, 33],
  iconAnchor: [12, 33],
  popupAnchor: [1, -24],
  tooltipAnchor: [0, 6],
  shadowSize: [36, 33],
  shadowAnchor: [12, 33],
});

const ICON_BLUE = L.icon({
  iconRetinaUrl: ICONS_FOLDER + 'marker-icon-blue-2x.png',
  iconUrl: ICONS_FOLDER + 'marker-icon-blue.png',
  shadowUrl: ICONS_FOLDER + 'marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [1, 0],
  shadowSize: [41, 41]
});

const ICON_RED = L.icon({
  iconRetinaUrl: ICONS_FOLDER + 'marker-icon-red-2x.png',
  iconUrl: ICONS_FOLDER + 'marker-icon-red.png',
  shadowUrl: ICONS_FOLDER + 'marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [1, 0],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = ICON_RED;




const TILES_OSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  minZoom: 3,
  maxZoom: 23,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

const TILES_GOOGLE_STREETS = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
  minZoom: 3,
  maxZoom: 23,
  subdomains:['mt0','mt1','mt2','mt3']
});

const TILES_GOOGLE_SAT = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
  minZoom: 3,
  maxZoom: 23,
  subdomains:['mt0','mt1','mt2','mt3']
});

const TILES_GOOGLE_HYBRID = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
  minZoom: 3,
  maxZoom: 23,
  subdomains:['mt0','mt1','mt2','mt3']
});

const baseLayers = {
  'OpenStreetMap': TILES_OSM,
  'Google Streets': TILES_GOOGLE_STREETS,
  'Google Sat': TILES_GOOGLE_SAT,
  'Google Hybrid': TILES_GOOGLE_HYBRID,
};








const DEFAULT_TPXLE_UL_TEXT = JSON.stringify(
  { "coordinates": [ 0, 0, 0 ] },
  null,
  4
);
const DEFAULT_GEOJSON_TEXT = JSON.stringify(
  {
    "type": "FeatureCollection",
    "features": []
  },
  null, 4
);

const searchProvider = new OpenStreetMapProvider();
const searchControl = GeoSearchControl({ 
  provider: searchProvider,
  showMarker: true,
  marker: {
    icon: ICON_RED,
    draggable: false,
  },
  position: 'topright',
});

@Injectable({
  providedIn: 'root'
})
export class LeafletMapService {

  private initialized = false;
  private markerAnimationFrames = new WeakMap<object, number>();
  private deviceNames: DeviceNames = {};
  private floorplanImages = L.layerGroup();
  private mapsWaitingForFloorplans = new Set<L.Map>();

  floorplans: FloorplanConfig[] = [];

  beaconMapInEditMode = false;

  beaconsFeatureGroup = L.featureGroup();
  devicesFeatureGroup = L.featureGroup();
  devices:any = {};
  
  geojsonFile:any;

  myAudioContext: any;
  beepsEnabled = false;

  // document.getElementById('tpxle-ul-textarea').value = defaultTpxleUlText;
  tpxleULTextarea = DEFAULT_TPXLE_UL_TEXT;

  // document.getElementById('geojsonTextarea').value = defaultGeojsonText;
  geojsonTextarea = DEFAULT_GEOJSON_TEXT


  constructor(
    @Inject(DOCUMENT) private document: Document,
    injector: Injector,
    private http: HttpClient,
    private dxLocationApiService: DxLocationApiService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private mqttClientService: MqttClientService
  ) {

    if (!customElements.get('app-beacon-settings-popup')) {
      // Convert `BeaconSettingsPopupComponent` to a custom element.
      const BeaconSettingsPopupElement = createCustomElement(BeaconSettingsPopupComponent, {injector});
      // Register the custom element with the browser.
      customElements.define('app-beacon-settings-popup', BeaconSettingsPopupElement);
    }

    this.myAudioContext = new window.AudioContext();

  }

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.loadDeviceNames();
    this.loadFloorplans();
    this.mqttClientService.locationUpdateMessage$.subscribe( (msg) => {
      this.updateDeviceMarker(msg);
    });
    this.getBluetoothMap();
  }

  updateDeviceMarker(msg:any) {

    let icon:any;
    
      if (this.devices[msg.deviceEUI]) {
        // this.devices[msg.deviceEUI].setLatLng([msg.coordinates[1], msg.coordinates[0]]).update();

        if (this.beepsEnabled) {
          this.beep(100, 440, 1);
        }

        if (msg.age > 120) {
          icon = ICON_PERSON_GREY;
        } else if (msg.uplinkPayload?.sosFlag === 1) {
          icon = ICON_PERSON_YELLOW;
        } else {
          icon = ICON_PERSON;
        }
        this.devices[msg.deviceEUI].setIcon(icon);
        this.devices[msg.deviceEUI].setPopupContent(this.getDevicePopupContent(msg));

        animateMarker(
          this.devices[msg.deviceEUI],
          [msg.coordinates[1], msg.coordinates[0]],
          2000,
          this.markerAnimationFrames,
        );

      } else {

        const t = ( (new Date()).getTime() - (new Date(msg.time)).getTime() ) / 1000;
        if (t>300) {
          icon = ICON_PERSON_GREY;
        } else if (msg.uplinkPayload?.sosFlag === 1) {
          icon = ICON_PERSON_YELLOW;
        } else {
          icon = ICON_PERSON;
        }

        this.devices[msg.deviceEUI] = L.marker([msg.coordinates[1], msg.coordinates[0]], {
          icon,
          pmIgnore: true,
          zIndexOffset: 1000,
          // title: msg.deviceEUI,
        });
        this.devices[msg.deviceEUI].bindPopup(this.getDevicePopupContent(msg)).addTo(this.devicesFeatureGroup);
        this.devices[msg.deviceEUI].bindTooltip(
          this.getDeviceName(msg.deviceEUI),
          {
            permanent: true, 
            opacity: 0.75,
            direction: 'bottom',
            className: 'marker-tooltip'
          }
        ).openTooltip();
      }
  }

  private getDevicePopupContent(msg: any): string {
    const sosFlag = msg.uplinkPayload?.sosFlag;
    const sosState = sosFlag === 1 ? 'ACTIVE' : sosFlag === 0 ? 'inactive' : 'unknown';

    return `DevEUI: ${msg.deviceEUI}<br />Time: ${msg.time}<br />SOS: ${sosState}`;
  }

  private loadDeviceNames(): void {
    const url = new URL('assets/device-names.jsonc', this.document.baseURI);
    url.searchParams.set('v', Date.now().toString());

    this.http.get(url.href, { responseType: 'text' }).subscribe({
      next: (text) => {
        const errors: ParseError[] = [];
        const deviceNames = parse(text, errors, { allowTrailingComma: true });

        if (errors.length > 0) {
          const descriptions = errors.map((error) =>
            `${printParseErrorCode(error.error)} at offset ${error.offset}`
          );
          console.error('Could not parse assets/device-names.jsonc:', descriptions.join(', '));
          return;
        }

        this.deviceNames = this.parseDeviceNames(deviceNames);

        Object.entries(this.devices).forEach(([deviceEUI, marker]: [string, any]) => {
          marker.getTooltip()?.setContent(this.getDeviceName(deviceEUI));
        });
      },
      error: (error) => {
        console.error('Could not load device names from assets/device-names.jsonc', error);
      },
    });
  }

  private parseDeviceNames(config: unknown): DeviceNames {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      console.error('assets/device-names.jsonc must contain a JSON object');
      return {};
    }

    const deviceNames: DeviceNames = {};

    Object.entries(config).forEach(([deviceEUI, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const name = (value as { name?: unknown }).name;
        if (typeof name === 'string') {
          deviceNames[deviceEUI.toLowerCase()] = { name };
        }
      }
    });

    return deviceNames;
  }

  private getDeviceName(deviceEUI: string): string {
    return this.deviceNames[deviceEUI.toLowerCase()]?.name || deviceEUI.substring(12);
  }

  private loadFloorplans(): void {
    const url = new URL('assets/floorplans.jsonc', this.document.baseURI);
    url.searchParams.set('v', Date.now().toString());

    this.http.get(url.href, { responseType: 'text' }).subscribe({
      next: (text) => {
        const errors: ParseError[] = [];
        const config = parse(text, errors, { allowTrailingComma: true });

        if (errors.length > 0) {
          const descriptions = errors.map((error) =>
            `${printParseErrorCode(error.error)} at offset ${error.offset}`
          );
          console.error('Could not parse assets/floorplans.jsonc:', descriptions.join(', '));
          return;
        }

        this.floorplans = this.parseFloorplans(config);
        this.floorplanImages.clearLayers();
        this.floorplans.forEach((floorplan) => {
          const imageUrl = new URL(floorplan.image, this.document.baseURI).href;
          this.floorplanImages.addLayer(L.imageOverlay(imageUrl, floorplan.bounds));
        });

        this.mapsWaitingForFloorplans.forEach((map) => this.setInitialFloorplan(map));
        this.mapsWaitingForFloorplans.clear();
      },
      error: (error) => {
        console.error('Could not load floorplans from assets/floorplans.jsonc', error);
      },
    });
  }

  private parseFloorplans(config: unknown): FloorplanConfig[] {
    if (!Array.isArray(config)) {
      console.error('assets/floorplans.jsonc must contain a JSON array');
      return [];
    }

    return config.filter((value): value is FloorplanConfig => {
      if (!value || typeof value !== 'object') return false;
      const floorplan = value as Partial<FloorplanConfig>;
      return typeof floorplan.id === 'string'
        && typeof floorplan.name === 'string'
        && typeof floorplan.image === 'string'
        && this.isFloorplanBounds(floorplan.bounds)
        && (floorplan.zoom === undefined || typeof floorplan.zoom === 'number')
        && (floorplan.default === undefined || typeof floorplan.default === 'boolean');
    });
  }

  private isFloorplanBounds(bounds: unknown): bounds is [[number, number], [number, number]] {
    return Array.isArray(bounds)
      && bounds.length === 2
      && bounds.every((point) =>
        Array.isArray(point)
        && point.length === 2
        && point.every((coordinate) => typeof coordinate === 'number')
      );
  }


  initMap(map:any) {

    map.addLayer(TILES_OSM);
    // map.addLayer(TILES_GOOGLE_SAT);
    map.addLayer(this.floorplanImages);
    map.addLayer(this.devicesFeatureGroup);
    map.addLayer(this.beaconsFeatureGroup);
    
    // let bounds = L.latLng(                    [
    //   26.275137, 49.954776,
    // ],).toBounds(100);
    // map.fitBounds(bounds, {padding: [150, 150]});

    this.setInitialFloorplan(map);
    // map.setView({lat: 0, lng: 0}, DEFAULT_ZOOM_LEVEL);
    
    map.addControl(
      L.control.layers(baseLayers, {
        'Trackerd objects': this.devicesFeatureGroup,
        'Beacon map': this.beaconsFeatureGroup,
        'Floorplan images': this.floorplanImages,
      })
    );

    this.beaconMapInEditMode = false;

    map.addControl(searchControl);

  }


  initBluetoothMap(map:any) {

    map.addLayer(TILES_OSM);
    map.addLayer(this.floorplanImages);
    // map.addLayer(this.devicesFeatureGroup);
    map.addLayer(this.beaconsFeatureGroup);
    this.setInitialFloorplan(map);
    
    map.addControl(
      L.control.layers(baseLayers, {
        // 'Markers': this.devicesFeatureGroup,
        // 'Beacon map': this.beaconsFeatureGroup,
        'Floorplan images': this.floorplanImages,
      })
    );

    this.initGeoman(map);
    this.beaconMapInEditMode = true;

    map.addControl(searchControl);

  }

  private setInitialFloorplan(map: any): void {
    const floorplan = this.floorplans.find((item) => item.default) || this.floorplans[0];
    if (floorplan) {
      this.zoomToFloorplan(map, floorplan);
    } else {
      map.setView([0, 0], 3);
      if (!this.mapsWaitingForFloorplans.has(map)) {
        this.mapsWaitingForFloorplans.add(map);
        map.once('unload', () => this.mapsWaitingForFloorplans.delete(map));
      }
    }
  }

  zoomToFloorplan(map: any, floorplan: FloorplanConfig): void {
    const center = L.latLngBounds(floorplan.bounds).getCenter();
    map.setView(center, floorplan.zoom ?? DEFAULT_ZOOM_LEVEL);
  }
  
  zoomToBeacons(map:any) {
    // map.fitBounds(this.beaconsFeatureGroup.getBounds(), {padding: [150, 150]});
    // map.setZoom(DEFAULT_ZOOM_LEVEL);

    map.setView(this.beaconsFeatureGroup.getBounds().getCenter(), DEFAULT_ZOOM_LEVEL);

    // map.flyToBounds(this.beaconsFeatureGroup.getBounds()) // , {padding: [50, 50]});
  }

  zoomToDevices(map:any) {
    // map.fitBounds(this.devicesFeatureGroup.getBounds(), {padding: [150, 150]});
    // map.setZoom(DEFAULT_ZOOM_LEVEL);

    map.setView(this.devicesFeatureGroup.getBounds().getCenter(), DEFAULT_ZOOM_LEVEL);

    // map.flyToBounds(this.devicesFeatureGroup.getBounds(), {padding: [150, 150]});
  }

  initGeoman(map:any) {
    map.pm.addControls({  
        position: 'topleft',
        drawMarker: false,
        drawCircleMarker: false,  
        drawCircle: false,
        drawPolyline: false,
        rotateMode: true,
        cutPolygon: false,
        snappingOption: true,
    });  
    map.pm.setGlobalOptions({ 
      snappable: false,
      layerGroup: this.beaconsFeatureGroup
    });

    map.on('pm:create', (e:any) => { // e.shape, e.layer
      this.setupLayer(e.layer, 'Bcn-XX', '00:00:00:00:00:00', '', 0);
      this.onExport();
    });

    // this.currentLocationMarker.addTo(map);

    let blueMarker = map.pm.Toolbar.copyDrawControl('drawMarker',{name: "beaconMarker"})
    blueMarker.drawInstance.setOptions({markerStyle: {icon : ICON_BLE_BEACON}, snappable: false});
    
    // let redMarker = map.pm.Toolbar.copyDrawControl('drawMarker',{name: "currentLocationMarker"})
    // redMarker.drawInstance.setOptions({markerStyle: {icon : ICON_RED}});
  }


  createPopupFunction(leafletId:any, name:any, mac:any, id:any, floor_number:number) {
    return (layer:any) => {
      if (!this.beaconMapInEditMode) return;
      const popupEl: NgElement & WithProperties<BeaconSettingsPopupComponent> = document.createElement('app-beacon-settings-popup') as any;
      popupEl.params = { leafletId, name, mac, id, floor_number };
      // Listen to the close event
      // popupEl.addEventListener('closed', () => document.body.removeChild(popupEl));
      popupEl.addEventListener('changed', (e:any) => {
        this.onMarkerChange(e.detail.leafletId, e.detail.name, e.detail.mac, e.detail.id, e.detail.floor_number);
      });
      // Add to the DOM
      document.body.appendChild(popupEl);
      return popupEl;
    }
  }

  private suppressPopupWhileDragging(marker: L.Marker) {
    let popup: L.Popup | undefined;

    marker.on('pm:dragstart', () => {
      marker.closePopup();
      popup = marker.getPopup();

      // Geoman uses its own drag handler, so Leaflet does not suppress the
      // click generated at the end of the drag. Temporarily unbinding the
      // popup keeps that click from opening it.
      if (popup) marker.unbindPopup();
    });

    marker.on('pm:dragend', () => {
      if (popup) {
        marker.bindPopup(popup);
        popup = undefined;
      }
    });
  }


  setupLayer (l:any, name:string, mac:string, id:string, floor_number:number) {
    // L.PM.reInitLayer(l);
    // l.on('pm:edit', ({ layer }) => {
    l.on('pm:edit', () => {
        this.onExport();
    });
    const leafletId = l._leaflet_id;
    if (l instanceof L.Marker) {
      // l.setIcon(ICON_RED);
      (l as any).feature = {
        type: "Feature",
        properties: {
          name: name,
          mac: mac,
          id: id,
          floor_number: floor_number,
        }
      };
      l.bindPopup(this.createPopupFunction(leafletId, name, mac, id, floor_number) as any);
      this.suppressPopupWhileDragging(l);
      l.bindTooltip(
        name, 
        {
          permanent: true, 
          opacity: 0.5,
          direction: 'bottom',
          className: 'beacon-tooltip'
        }
      ).openTooltip();
    };

  };

  updateMarker (leafletId:any, name:string, mac:string, id:string, floor_number:number) {
    const m:any = this.beaconsFeatureGroup.getLayer(leafletId);
    m.feature.properties.name = name;
    m.feature.properties.mac = mac;
    m.feature.properties.id = id;
    m.feature.properties.floor_number = parseInt(floor_number.toString()); // workaround to make sure the that it is number in the exported geojson 
    m.getPopup()
      .setContent(this.createPopupFunction(leafletId, name, mac, id, floor_number) as any)
      .update();
    m.getTooltip()
      .setContent(name)
      .update();
  }

  onMarkerChange(leafletId:any, name:string, mac:string, id:string, floor_number:number) {
    this.updateMarker(leafletId, name, mac, id, floor_number);
    this.onExport();
  }

  clearBeaconMap() {
    this.beaconsFeatureGroup.eachLayer( (layer) => {
      this.beaconsFeatureGroup.removeLayer(layer);
    })
  }

  importFeatures(features:any) { 
    let group:any = [];
    try {

      L.geoJSON(features, { 
        snapIgnore: true,
        onEachFeature: (feature, layer) => {

          if ((feature.geometry.type == 'Point') && (layer instanceof L.Marker) ) { 

            layer.setIcon(ICON_BLE_BEACON);

            if (feature.properties === undefined) throw new Error('Missing "properties" property from "feature"!');
            if (feature.properties.name === undefined) throw new Error('Missing "name" property from "properties"!');
            if ((feature.properties.mac === undefined) && (feature.properties.id === undefined)) throw new Error('Either "mac" or "id" property must be specified in "properties"!');
            if ((feature.properties.mac !== '') && (feature.properties.id !== '')) throw new Error('Either "mac" or "id" properties must be specified. It is not allowed to define both!');
            
          }

          group.push([layer, feature.properties.name, feature.properties.mac || '', feature.properties.id, feature.properties.floor_number || 0]);

          // this.setupLayer(layer, feature.properties.name, feature.properties.mac || '', feature.properties.id);
          // layer.addTo(this.beaconsFeatureGroup);

        }
      });

      this.clearBeaconMap();

      group.forEach( (element:[any,string,string,string,number]) => {
        element[0].addTo(this.beaconsFeatureGroup);
        this.setupLayer(...element);
      });

    } catch(error:any) {
      this.reportError(error);
    }

  }


  getBluetoothMap() {

    this.dxLocationApiService.getBluetoothMap().subscribe(
      (features:any) => this.importFeatures(features),
      (error:any) => {
        this.reportError(error);
      }
    );

  }

  deleteBluetoothMap() {
    this.dxLocationApiService.deleteBluetoothMap().subscribe(
      (result:any) => {
        console.log(JSON.stringify(result));
      },
      (error:any) => { 
        this.reportError(error);
      }
    )
  }

  delsetBluetoothMap() {
    this.dxLocationApiService.deleteBluetoothMap().subscribe(
      (result:any) => {
        this.setBluetoothMap();
      },
      (error:any) => { console.log(error);
        if (error.status === 404) {
          this.setBluetoothMap();
        } else {
          this.reportError(error);
        }        
      }
    )
  }

  setBluetoothMap() {
    this.dxLocationApiService.setBluetoothMap(this.beaconsFeatureGroup.toGeoJSON()).subscribe(
      (result:any) => {
        console.log(JSON.stringify(result));
      },
      (error:any) => {
        this.reportError(error);
      }
    );
  }

  onExport() {

  }

  exportMap(map:any) {
    // this.geojsonTextarea = JSON.stringify(this.beaconsFeatureGroup.toGeoJSON(), null, 4);
    // alert(JSON.stringify(this.beaconsFeatureGroup.toGeoJSON(), null, 4));
    this.openDialog(JSON.stringify(this.beaconsFeatureGroup.toGeoJSON(), null, 4), map)
  }

  openDialog(geoJsonText:string, map:any): void {
    const dialogRef = this.dialog.open(TextareaDialogComponent, {
      minWidth: '400px',
      minHeight: '500px',
      data: {title: "Please edit the GeoJSON content here!", inputText: geoJsonText},
      panelClass: 'custom-mat-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result:any) => {
      if(result) {
        try {
          let features = JSON.parse(result);
          this.importFeatures(features);
        }
        catch(error:any) {
          this.reportError(error);
        }
      }
    });
  }

  reportError(error:any) {
    if (isAuthenticationError(error)) return;
    this.snackBar.open(
      'ERROR: ' + getApiErrorMessage(error),
      'x', {
        panelClass: ['red-snackbar'],
      }
    );       
  }


  beep(duration:number, frequency:number, volume:number){

    return new Promise<void>((resolve, reject) => {
      // Set default duration if not provided
      duration = duration || 200;
      frequency = frequency || 440;
      volume = volume || 100;

      try{
          let oscillatorNode = this.myAudioContext.createOscillator();
          let gainNode = this.myAudioContext.createGain();
          oscillatorNode.connect(gainNode);

          // Set the oscillator frequency in hertz
          oscillatorNode.frequency.value = frequency;

          // Set the type of oscillator
          oscillatorNode.type= "square";
          gainNode.connect(this.myAudioContext.destination);

          // Set the gain to the volume
          gainNode.gain.value = volume * 0.01;

          // Start audio with the desired duration
          oscillatorNode.start(this.myAudioContext.currentTime);
          oscillatorNode.stop(this.myAudioContext.currentTime + duration * 0.001);

          // Resolve the promise when the sound is finished
          oscillatorNode.onended = () => {
              resolve();
          };
      }catch(error){
          reject(error);
      }
    });

  }

}
