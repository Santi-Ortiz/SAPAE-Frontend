import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { RegisterDTO } from '../dtos/register-dto';
import { first } from 'rxjs';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-registro',
  templateUrl: './registro.html',
  styleUrls: ['./registro.css']
})
export class Registro implements OnInit {
  registroForm!: FormGroup;
  loading = false;
  enviado = false;
  error = '';
  mostrarLaContrasena: boolean = false;
  mostrarLaConfirmarContrasena: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.registroForm = this.formBuilder.group({
      primerNombre: ['', [Validators.required, Validators.minLength(2)]],
      segundoNombre: [''],
      primerApellido: ['', [Validators.required, Validators.minLength(2)]],
      segundoApellido: ['', [Validators.required, Validators.minLength(2)]],
      codigo: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      correo: ['', [Validators.required, Validators.email, this.javerianaEmailValidator]],
      carrera: ['', [Validators.required, Validators.minLength(2)]],
      anioIngreso: ['', [Validators.required, Validators.min(2000), Validators.max(new Date().getFullYear())]],
      contrasenia: ['', [Validators.required, Validators.minLength(8)]],
      confirmarContrasenia: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  get f() { return this.registroForm.controls; }

  // Validador personalizado para email javeriano
  javerianaEmailValidator(control: any) {
    if (control.value && !control.value.endsWith('@javeriana.edu.co')) {
      return { javerianaEmail: true };
    }
    return null;
  }

  // Validador para confirmar contraseña
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('contrasenia');
    const confirmPassword = form.get('confirmarContrasenia');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    this.enviado = true;
    this.error = '';

    if (this.registroForm.invalid) {
      console.log('Formulario inválido:', this.registroForm.errors);
      return;
    }

    this.loading = true;

    const registerDto: RegisterDTO = new RegisterDTO(
      this.f['codigo'].value,
      this.f['correo'].value,
      this.f['carrera'].value,
      this.f['contrasenia'].value,
      parseInt(this.f['anioIngreso'].value),
      this.f['primerNombre'].value,
      this.f['primerApellido'].value,
      this.f['segundoApellido'].value,
      this.f['segundoNombre'].value || undefined
    );

    this.authService.register(registerDto)
      .pipe(first())
      .subscribe({
        next: () => {
          console.log('Registro exitoso');
          this.router.navigate(['/main']);
        },
        error: error => {
          console.error('Error en registro:', error);
          this.error = 'Error al registrar usuario. Verifique los datos e intente nuevamente.';
          this.loading = false;
        }
      });
  }

  mostrarContrasena() {
    this.mostrarLaContrasena = !this.mostrarLaContrasena;
  }

  mostrarConfirmarContrasena() {
    this.mostrarLaConfirmarContrasena = !this.mostrarLaConfirmarContrasena;
  }

  irALogin() {
    this.router.navigate(['/login']);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.f[fieldName];
    if (field.errors && (field.dirty || field.touched || this.enviado)) {
      if (field.errors['required']) return `${this.getFieldDisplayName(fieldName)} es requerido`;
      if (field.errors['email']) return 'Formato de correo inválido';
      if (field.errors['javerianaEmail']) return 'El correo debe terminar con @javeriana.edu.co';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['pattern']) return 'Código debe tener 8 dígitos';
      if (field.errors['min']) return `Año mínimo: ${field.errors['min'].min}`;
      if (field.errors['max']) return `Año máximo: ${field.errors['max'].max}`;
    }
    return '';
  }

  getFieldDisplayName(fieldName: string): string {
    const names: { [key: string]: string } = {
      'primerNombre': 'Primer nombre',
      'segundoNombre': 'Segundo nombre',
      'primerApellido': 'Primer apellido',
      'segundoApellido': 'Segundo apellido',
      'codigo': 'Código',
      'correo': 'Correo',
      'carrera': 'Carrera',
      'anioIngreso': 'Año de ingreso',
      'contrasenia': 'Contraseña',
      'confirmarContrasenia': 'Confirmar contraseña'
    };
    return names[fieldName] || fieldName;
  }

  hasPasswordMismatch(): boolean {
    return this.registroForm.errors?.['passwordMismatch'] &&
      (this.f['confirmarContrasenia'].dirty || this.f['confirmarContrasenia'].touched || this.enviado);
  }
}
