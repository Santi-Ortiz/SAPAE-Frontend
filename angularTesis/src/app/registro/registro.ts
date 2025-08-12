import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  imports: [CommonModule,FormsModule],
  selector: 'app-registro',
  templateUrl: './registro.html',
  styleUrls: ['./registro.css']
})
export class Registro {
  primerNombre: string = '';
  segundoNombre: string = '';
  primerApellido: string = '';
  segundoApellido: string = '';
  correo: string = '';
  clave: string = '';
  confirmarClave: string = '';

  mensajeCorreo: string = '';
  mensajeClave: string = '';
  mensajeConfirmarClave: string = '';
  mensajeCampos: string = '';

  mostrarLaContrasena: boolean = false;
  mostrarLaConfirmarContrasena: boolean = false;

  constructor(private router: Router) {}

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
  this.validarConfirmarClave();
}

validarConfirmarClave() {
  if (this.confirmarClave !== this.clave) {
    this.mensajeConfirmarClave = 'Las contraseñas no coinciden';
  } else {
    this.mensajeConfirmarClave = '';
  }
}

mostrarContrasena() {
  this.mostrarLaContrasena = !this.mostrarLaContrasena;
}

mostrarConfirmarContrasena() {
  this.mostrarLaConfirmarContrasena = !this.mostrarLaConfirmarContrasena;
}

validarCamposObligatorios() {
  if (!this.primerNombre.trim() || !this.primerApellido.trim() || !this.segundoApellido.trim()) {
    this.mensajeCampos = 'Debe completar todos los campos obligatorios';
  } else {
    this.mensajeCampos = '';
  }
}

registrarse() {
    this.validarCamposObligatorios();
    this.validarCorreo();
    this.validarClave();
    this.validarConfirmarClave();

    if (this.mensajeCampos || this.mensajeCorreo || this.mensajeClave || this.mensajeConfirmarClave) {
      return;
    }

    this.router.navigate(['/login']);
  }

  irALogin() {
    this.router.navigate(['/login']);
  }
}
