import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  returnUrl!: string;
  error = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasenia: ['', Validators.required]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/main';
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

    console.log('🔵 Enviando datos de login:', loginDto);

    this.authService.login(loginDto)
      .pipe(first())
      .subscribe({
        next: () => {
          console.log('✅ Login exitoso, verificando cookies...');
          this.authService.debugCookies();
          this.router.navigate([this.returnUrl]);
        },
        error: error => {
          console.error('❌ Error en login:', error);
          this.error = 'Credenciales incorrectas. Verifica tu correo y contraseña.';
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
