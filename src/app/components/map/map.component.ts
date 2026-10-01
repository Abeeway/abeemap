import { Component, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

import * as L from 'leaflet';
import { FullScreen } from 'leaflet.fullscreen';

import { FloorplanConfig, LeafletMapService } from '../../services/leaflet-map.service';
import { AppMaterialModule } from '../../app-material.module';

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [FormsModule, AppMaterialModule],
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') private mapContainer!: ElementRef<HTMLDivElement>;
  private map?: L.Map;

  constructor(
    public leafletMapService: LeafletMapService,
  ) {
  }
  
  ngOnInit(): void {
    this.leafletMapService.initialize();
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement);
    this.map.addControl(new FullScreen({ position: 'topleft' }));
    this.leafletMapService.initMap(this.map);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map?.off();
    this.map = undefined;
  }

  zoomToFloorplan(floorplan: FloorplanConfig) {
    if (this.map) this.leafletMapService.zoomToFloorplan(this.map, floorplan);
  }

  zoomToBeacons() {
    if (this.map) this.leafletMapService.zoomToBeacons(this.map);
  }

  zoomToDevices() {
    if (this.map) this.leafletMapService.zoomToDevices(this.map);
  }

}
