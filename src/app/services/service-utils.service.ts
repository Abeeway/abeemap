import { Injectable } from '@angular/core';

import { Observable , of, throwError, } from 'rxjs';
import { MatSnackBar} from '@angular/material/snack-bar';

// import { AuthService } from './auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceUtilsService {

  constructor(
    private snackBar: MatSnackBar,
    // private authService: AuthService,
  ) { }

  handleError<T>(operation = 'operation', result?: T) {


    return (error: any): Observable<T> => {

      console.error(`${operation} failed: ${error.error.message.message}`);

      if ( (error.error.code === 401) || (error.error.code === 403) ) {

        this.snackBar.open(
          error.error.message,
          'login',
          { panelClass: ['red-snackbar'] },
        )
          .onAction().subscribe(() => {
            // this.authService.deleteSession();
            // this.authService.login();
          });

          return of(result as T);

      } else {

        return throwError(error);
        
      }

    };
  }

  log(message: string) {
    this.snackBar.open(message, '', {
      panelClass: ['green-snackbar'],
      duration: 3000,
    });
    // console.log(message);
  }

}
