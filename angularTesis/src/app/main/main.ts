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
  cargando: boolean = false;
  isDragOver: boolean = false;

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
    {
      title: 'Optimizar tu tiempo',
      description: 'Planifica tu carga académica de manera eficiente y evita conflictos de horarios.'
    },
    {
      title: 'Tener mayor control sobre tu avance',
      description: 'Visualiza tu progreso académico en tiempo real y toma decisiones informadas.'
    },
    {
      title: 'Planear según tus objetivos personales',
      description: 'Personaliza tu ruta académica según tus metas profesionales y preferencias.'
    },
    {
      title: 'Prevenir retrasos',
      description: 'Identifica posibles obstáculos y toma medidas preventivas a tiempo.'
    },
    {
      title: 'Apoyar decisiones académicas con información confiable',
      description: 'Recibe recomendaciones basadas en datos y estadísticas académicas actuales.'
    }
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
    this.cargando = true;

    this.lecturaService.subirArchivo(this.historial.archivoSeleccionado).subscribe({
      next: (respuesta) => {
        this.historialService.setHistorial(respuesta);
        this.router.navigate(['/historial']);
        this.cargando = false;
      },
      error: () => {
        this.historial.error = 'El archivo no corresponde a un informe de avance.';
        this.cargando = false;
      }
    });
  }

  cerrarSesion() {
    this.router.navigate(['/login']);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        this.historial.archivoSeleccionado = file;
        this.historial.error = '';
      } else {
        this.historial.error = 'Solo se permiten archivos PDF.';
      }
    }
  }

  removeFile(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.historial.archivoSeleccionado = undefined;
    this.historial.error = '';
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}