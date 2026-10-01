import { Component, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

// import { Inject }  from '@angular/core';
// import { DOCUMENT } from '@angular/common';

import * as L from 'leaflet';
import { FullScreen } from 'leaflet.fullscreen';
// import '@geoman-io/leaflet-geoman-free';

import { LeafletMapService } from '../../services/leaflet-map.service';

import { MatDialog } from '@angular/material/dialog';
import { AlertDialogComponent } from '../alert-dialog/alert-dialog.component';
import { AppMaterialModule } from '../../app-material.module';

@Component({
    selector: 'app-bluetooth-map',
    templateUrl: './bluetooth-map.component.html',
    styleUrls: ['./bluetooth-map.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [AppMaterialModule],
})
export class BluetoothMapComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') private mapContainer!: ElementRef<HTMLDivElement>;
  private map?: L.Map;

  constructor(
    // @Inject(DOCUMENT) document:any,
    private leafletMapService: LeafletMapService,
    private dialog: MatDialog,
  ) {

  }
  
  ngOnInit(): void {
    this.leafletMapService.initialize();
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement);
    this.map.addControl(new FullScreen({ position: 'topleft' }));
    this.leafletMapService.initBluetoothMap(this.map);
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map?.off();
    this.map = undefined;
  }

  getBluetoothMap() { 
    this.leafletMapService.getBluetoothMap() 
  }

  delsetBluetoothMap() { 
    const dialogRef = this.dialog.open(AlertDialogComponent, {
      data: {
        title: 'Save?',
        message: `Do you really want to overwrite the BLE Beacon Map at TPXLE?` },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.leafletMapService.delsetBluetoothMap() 
      }
    });
  }

  deleteBluetoothMap() {

    const dialogRef = this.dialog.open(AlertDialogComponent, {
      data: {
        title: 'Delete?',
        message: `Do you really want to delete the BLE Beacon Map from TPXLE?` },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.leafletMapService.deleteBluetoothMap() 
      }
    });
  }
  
  // switchMap() {
  //   this.leafletMapService.switchMap(this.map) 
  // }
  
  clearMap() {
    this.leafletMapService.clearBeaconMap()
  }
  
  exportMap() {
    if (this.map) this.leafletMapService.exportMap(this.map);
  }

  zoomToBeacons() {
    if (this.map) this.leafletMapService.zoomToBeacons(this.map);
  }

}
