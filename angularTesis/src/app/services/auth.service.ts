import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthResponseDTO } from '../dtos/auth-response-dto';
import { LoginDTO } from '../dtos/login-dto';
import { environment } from '../../environments/environment';
import { BehaviorSubject, catchError, lastValueFrom, map, Observable, of, throwError } from 'rxjs';

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

    // Se verifica el estado de la autenticación del usuario 
    // Solo si no estamos en la página de login
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      this.checkAuthenticationStatus();
    }
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  login(loginDTO: LoginDTO): Observable<AuthResponseDTO> {
    console.log('🔵 Enviando login request a:', `${this.apiUrl}/api/auth/login`);
    console.log('🔵 Con withCredentials:', true);

    return this.http.post<AuthResponseDTO>(`${this.apiUrl}/api/auth/login`, loginDTO, {
      withCredentials: true,
      observe: 'response' // Para ver las headers de respuesta
    }).pipe(
      map(response => {
        console.log('✅ Login response headers:', response.headers);
        console.log('✅ Login response body:', response.body);
        console.log('🍪 Cookies después del login:', document.cookie);

        if (response.body) {
          this.currentUserSubject.next(true);
        }
        return response.body!;
      })
    );
  }

  logout(): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/api/auth/logout`, {}, {
      withCredentials: true
    }).pipe(
      map(response => {
        this.currentUserSubject.next(false);
        return response;
      }),
      catchError(error => {
        this.currentUserSubject.next(false);
        return throwError(error);
      })
    );
  }

  isAuthenticated(): Observable<boolean> {
    console.log('🔍 Verificando autenticación en:', `${this.apiUrl}/api/auth/verify`);

    return this.http.get<boolean>(`${this.apiUrl}/api/auth/verify`, {
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('✅ Respuesta de verificación:', response);
        this.currentUserSubject.next(response);
        return response;
      }),
      catchError(error => {
        console.log('❌ Error en verificación:', error.status, error.message);
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
    console.log('🍪 All accessible cookies:', document.cookie);
    console.log('🔍 JWT cookie exists in document.cookie:', document.cookie.includes('jwt-token'));

    // Probar si la cookie se envía automáticamente
    this.testCookieRequest();
  }

  private testCookieRequest(): void {
    console.log('🧪 Probando si la cookie se envía automáticamente...');
    this.isAuthenticated().subscribe({
      next: (result) => {
        console.log('✅ Test de cookie exitoso:', result);
      },
      error: (error) => {
        console.log('❌ Test de cookie falló:', error);
      }
    });
  }

  private checkAuthenticationStatus(): void {
    this.isAuthenticated().subscribe();
  }

}

