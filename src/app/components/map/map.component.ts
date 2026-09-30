import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
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

  private map: any;

  constructor(
    public leafletMapService: LeafletMapService,
  ) {
  }
  
  ngOnInit(): void {
    this.leafletMapService.initialize();
  }

  ngAfterViewInit(): void { 

    setTimeout( () => {

      this.map = L.map('map');
      this.map.addControl(new FullScreen({ position: 'topleft' }));
      this.leafletMapService.initMap(this.map);

    }, 300)

  }

  ngOnDestroy(): void {
    this.map.off();
    this.map.remove();
  }

  zoomToFloorplan(floorplan: FloorplanConfig) {
    this.leafletMapService.zoomToFloorplan(this.map, floorplan);
  }

  zoomToBeacons() {
    this.leafletMapService.zoomToBeacons(this.map)
  }

  zoomToDevices() {
    this.leafletMapService.zoomToDevices(this.map)
  }

}
