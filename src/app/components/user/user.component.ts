import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { AuthService } from '../../auth/auth.service';

import { CONFIG } from '../../../environments/environment';

@Component({
    selector: 'app-user',
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class UserComponent implements OnInit {

  // prefix;
  userId;
  scope;
  sessionExpires;

  constructor(
    public authService: AuthService
  ) { 
    // this.prefix = CONFIG.DXAPI_PROFILE;
    this.userId = this.authService.userId || '';
    this.scope = (Array.isArray(this.authService.scope)) ? this.authService.scope[0] : '';
    this.sessionExpires = this.authService.getExp() || '';
  }

  ngOnInit(): void {
  }

}
