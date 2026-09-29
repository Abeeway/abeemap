import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

interface PopupParams {leafletId:any, name:string, mac:string, id:string, floor_number:number,}

@Component({
    selector: 'app-beacon-settings-popup',
    templateUrl: './beacon-settings-popup.component.html',
    styleUrls: ['./beacon-settings-popup.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class BeaconSettingsPopupComponent implements OnInit {

  @Input() params:PopupParams = {leafletId:'', name:'', mac:'', id:'', floor_number:0,};
  @Output() changed = new EventEmitter<PopupParams>();
  idType = '';

  constructor() {}

  ngOnInit(): void {
    this.idType = (this.params.id !== '') ? 'id' : 'mac';
  }

  onChange() {
  }

  onSave() {
    this.changed.emit(this.params);
  }

  idTypeChanged() {
    if (this.idType === 'mac' ) {
      this.params.id = '';
      this.params.mac = '00:00:00:00:00:00';
    } else {
      this.params.id = '00-00-00-00-00-00';
      this.params.mac = '';
    }
  }

}
