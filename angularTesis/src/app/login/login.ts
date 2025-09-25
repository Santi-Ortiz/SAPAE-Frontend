import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { LoginDTO } from '../dtos/login-dto';
import { first } from 'rxjs';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  mostrarLaContrasena: boolean = false;
  loginForm!: FormGroup;
  loading = false;
  enviado = false;
  error = '';

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasenia: ['', Validators.required]
    });
  }

  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.enviado = true;
    this.error = '';

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const loginDto: LoginDTO = {
      correo: this.f['correo'].value,
      contrasenia: this.f['contrasenia'].value
    };

    console.log('Login data:', loginDto);

    this.authService.login(loginDto)
      .pipe(first())
      .subscribe({
        next: () => {
          console.log('Login exitoso');
          this.router.navigate(['/main']);
        },
        error: error => {
          console.error('Error en login:', error);
          this.error = 'Correo y/o contraseñas incorrectas';
          this.loading = false;
        }
      });
  }

  mostrarContrasena() {
    this.mostrarLaContrasena = !this.mostrarLaContrasena;
  }

  irARegistro() {
    this.router.navigate(['/registro']);
  }
}
