import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    console.log('🔧 Interceptor procesando URL:', request.url);

    // Incluir credentials en TODAS las requests que vayan al backend
    // Verificar si la URL pertenece a nuestro backend
    const isBackendRequest = request.url.startsWith('http://localhost:8080') ||
      request.url.startsWith(environment.SERVER_URL) ||
      request.url.includes('localhost:8080');

    if (isBackendRequest) {
      console.log('✅ Agregando withCredentials a:', request.url);
      request = request.clone({
        withCredentials: true // Se incluyen las cookies
      });
    } else {
      console.log('❌ NO agregando withCredentials a:', request.url);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('❌ Error interceptado:', error.status, 'en URL:', request.url);
        if (error.status === 401 || error.status === 403) {
          this.authService.logout().subscribe(() => {
            this.router.navigate(['/login']);
          });
        }
        return throwError(() => error);
      })
    );

  }

}

