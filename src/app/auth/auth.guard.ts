import { inject } from '@angular/core';
import {
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  // createUrlTreeFromSnapshot,
  // Router,
} from '@angular/router';
// import { Observable } from 'rxjs';

import { AuthService } from './auth.service';

export const canActivate: CanActivateFn = (actdRoute: ActivatedRouteSnapshot, rtrState: RouterStateSnapshot) => {

  const authService = inject(AuthService);
  // const router = inject(Router);

  const queryParams = { ...actdRoute.queryParams };

  if ('access_token' in queryParams && 'state' in queryParams) {

    const tokenIsValid: boolean = authService.setSession(
      queryParams.access_token,
      queryParams.state
    );

    // delete queryParams.access_token;
    // delete queryParams.state;
    // setTimeout( () => {
    //     router.navigate([actdRoute.url.join('/')], { queryParams });
    //     // router.navigate(actdRoute.url, { queryParams });
    //   }, 500
    // )

    const parsedUrl = new URL(window.location.href);
    parsedUrl.searchParams.delete('access_token');
    parsedUrl.searchParams.delete('state');
    window.location.href = parsedUrl.href;

    return false;
    
  } else if (authService.loggedIn) {

    return true;

  } else {
    
    authService.login(window.location.href);

    return false;

  }
  
};