import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JwtAuthenticationResponse } from '../dto/jwt-authentication-response';
import { LoginDTO } from '../dto/login-dto';
import { environment } from '../../environments/environment';
import { lastValueFrom } from 'rxjs';

const JWT_TOKEN = "jwt-token";
const EMAIL = "user-email";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  login(loginDTO: LoginDTO): Promise<void> {
    return lastValueFrom(
      this.http.post<JwtAuthenticationResponse>(`${environment.SERVER_URL}/auth/login`, loginDTO)
    ).then((jwt: JwtAuthenticationResponse) => {
      // Guarda los valores en sessionStorage
      sessionStorage.setItem(JWT_TOKEN, jwt.token);
      sessionStorage.setItem(EMAIL, jwt.email);
      console.log("Token guardado:", jwt.token); // Verifica el token
    });
  }

  logout() {
    sessionStorage.removeItem(JWT_TOKEN);
    sessionStorage.removeItem(EMAIL);
  }

  isAuthenticated() {
    return sessionStorage.getItem(JWT_TOKEN) != null;
  }

  token() {
    return sessionStorage.getItem(JWT_TOKEN);
  }
}

