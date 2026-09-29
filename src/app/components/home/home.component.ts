import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { CONFIG } from '../../../environments/environment';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class HomeComponent implements OnInit {

  admurl = `${CONFIG.ADM_URL}?dxprofile=${CONFIG.DXAPI_PROFILE}&solver`

  constructor(
  ) { }

  ngOnInit(): void {
  }

}
