import { Component, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LecturaService } from '../services/lectura.service';
import { HistorialService } from '../services/historial.service';
import { Progreso } from '../models/progreso.model';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterModule, NgIf, NgFor],
  templateUrl: './main.html',
  styleUrls: ['./main.css']
})
export class Main {

  historial: Progreso = new Progreso();
  mostrarMenu = false;

  constructor(
    private lecturaService: LecturaService,
    private historialService: HistorialService,
    private router: Router
  ) { }

  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;

  features = [
    {
      title: 'Historial de progreso',
      description: 'Consulta tu progreso de manera visual e intuitiva a través del informe de avance cargado.',
      image: 'assets/images/plan-de-carrera.jpg'
    },
    {
      title: 'Simulación académica',
      description: 'Genera proyecciones personalizadas según tus asignaturas aprobadas y objetivos académicos.',
      image: 'assets/images/plan-de-carrera.jpg'
    },
    {
      title: 'Recomendación de materias',
      description: 'Recibe sugerencias de asignaturas basadas en tus gustos con ayuda de un sistema inteligente.',
      image: 'assets/images/plan-de-carrera.jpg'
    },
    {
      title: 'Búsqueda de materias',
      description: 'Encuentra materias por nombre, área o nivel con inteligencia integrada.',
      image: 'assets/images/plan-de-carrera.jpg'
    }
  ];

  toggleMenu() {
    this.mostrarMenu = !this.mostrarMenu;
  }

  scrollLeft() {
    this.scrollContainer.nativeElement.scrollBy({
      left: -300,
      behavior: 'smooth'
    });
  }

  scrollRight() {
    this.scrollContainer.nativeElement.scrollBy({
      left: 300,
      behavior: 'smooth'
    });
  }

  benefits = [
    'Optimizar tu tiempo',
    'Tener mayor control sobre tu avance',
    'Planear según tus objetivos personales',
    'Prevenir retrasos',
    'Apoyar decisiones académicas con información confiable'
  ];


  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.historial.archivoSeleccionado = file;
      this.historial.error = '';
    } else {
      this.historial.error = 'Debe seleccionar un archivo PDF válido.';
    }
  }

  onSubmit(): void {
    if (!this.historial.archivoSeleccionado) {
      this.historial.error = 'Primero seleccione un archivo PDF.';
      return;
    }

    this.lecturaService.subirArchivo(this.historial.archivoSeleccionado).subscribe({
      next: (respuesta) => {
        this.historialService.setHistorial(respuesta);
        this.router.navigate(['/historial']); // Redirige con los datos
      },
      error: () => {
        this.historial.error = 'El archivo no corresponde a un informe de avance.';
      }
    });
  }

  cerrarSesion(){
    this.router.navigate(['/login']);
  }
}