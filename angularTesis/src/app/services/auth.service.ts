import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthResponseDTO } from '../dtos/auth-response-dto';
import { LoginDTO } from '../dtos/login-dto';
import { environment } from '../../environments/environment';
import { BehaviorSubject, catchError, lastValueFrom, map, Observable, of, throwError } from 'rxjs';
import { RegisterDTO } from '../dtos/register-dto';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any>;
  private currentUser: Observable<any>;
  private apiUrl = `${environment.SERVER_URL}`;

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<boolean>(false);
    this.currentUser = this.currentUserSubject.asObservable();

    if (!window.location.pathname.includes('/login')) {
      this.checkAuthenticationStatus();
    }
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  login(loginDTO: LoginDTO): Observable<AuthResponseDTO> {
    return this.http.post<AuthResponseDTO>(`${this.apiUrl}/api/auth/login`, loginDTO, {
      withCredentials: true,
      observe: 'response'
    }).pipe(
      map(response => {
        console.log('Login response headers:', response.headers);
        console.log('Login response body:', response.body);

        if (response.body) {
          this.currentUserSubject.next(true);
        }
        return response.body!;
      }),
      catchError(error => {
        console.error('❌ Error en login:', error);
        this.currentUserSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  register(registerDTO: RegisterDTO): Observable<string> {

    return this.http.post(`${this.apiUrl}/api/auth/register`, registerDTO, {
      withCredentials: true,
      responseType: 'text' // Importante: especificar que esperamos texto, no JSON
    }).pipe(
      map(response => {
        console.log('Registro response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error en registro:', error);
        let errorMessage = 'Error al registrar usuario';
        
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }


  logout(): Observable<string> {

    return this.http.post<string>(`${this.apiUrl}/api/auth/logout`, {}, {
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('Logout exitoso');
        this.currentUserSubject.next(false);
        return response;
      }),
      catchError(error => {
        this.currentUserSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  isAuthenticated(): Observable<boolean> {

    return this.http.get<boolean>(`${this.apiUrl}/api/auth/verify`, {
      withCredentials: true
    }).pipe(
      map(response => {
        this.currentUserSubject.next(response);
        return response;
      }),
      catchError(error => {
        this.currentUserSubject.next(false);
        return of(false);
      })
    );
  }

  isAuthenticatedSync(): boolean {
    return this.currentUserValue;
  }

  // Método para debugging
  debugCookies(): void {
    console.log('Cookies:', document.cookie);

    this.testCookieRequest();
  }

  private testCookieRequest(): void {
    this.isAuthenticated().subscribe({
      next: (result) => {
        console.log('Test de cookie exitoso:', result);
      },
      error: (error) => {
        console.log('Test de cookie falló:', error);
      }
    });
  }

  private checkAuthenticationStatus(): void {
    this.isAuthenticated().subscribe();
  }

}

