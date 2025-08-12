import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [CommonModule,FormsModule],
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  correo: string = '';
  clave: string = '';
  mostrarLaContrasena: boolean = false;

  mensajeCorreo: string = '';
  mensajeClave: string = '';

  constructor(private router: Router) {}
  
  mostrarContrasena() {
    this.mostrarLaContrasena = !this.mostrarLaContrasena;
  }

  validarCorreo() {
    if (!this.correo.endsWith('@javeriana.edu.co')) {
      this.mensajeCorreo = 'El correo debe terminar con @javeriana.edu.co';
    } else {
      this.mensajeCorreo = '';
    }
  }

  validarClave() {
    if (this.clave.length < 8) {
      this.mensajeClave = 'La contraseña debe tener al menos 8 caracteres';
    } else {
      this.mensajeClave = '';
    }
  }

  iniciarSesion() {
    this.validarCorreo();
    this.validarClave();

    if (this.mensajeCorreo || this.mensajeClave) {
      return;
    }
    
    this.router.navigate(['/main']);
    console.log('Iniciando sesión con', this.correo, this.clave);
  }

  irARegistro() {
    this.router.navigate(['/registro']);
  }
}
