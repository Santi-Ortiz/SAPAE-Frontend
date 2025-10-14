import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HistorialSimulacionesService } from '../services/historial-simulaciones.service';
import { SimulacionService } from '../services/simulacion.service';
import { Proyeccion } from '../models/proyeccion.model';

@Component({
  selector: 'app-historial-simulaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-simulaciones.component.html',
  styleUrls: ['./historial-simulaciones.component.css']
})
export class HistorialSimulacionesComponent implements OnInit {
  simulacionesGuardadas: Proyeccion[] = [];
  
  defaultPriorizacionesLabels: string[] = [
    'Núcleo Ciencias Básicas',
    'Núcleo Ingeniería Aplicada',
    'Núcleo Socio-Humanística',
    'Electivas',
    'Complementarias',
    'Énfasis'
  ];
  
  // Variables para controlar los modales
  mostrarModalEliminar = false;
  mostrarModalLimpiar = false;
  simulacionAEliminar: Proyeccion | null = null;

  constructor(
    private router: Router,
    private historialSimulacionesService: HistorialSimulacionesService,
    private simulacionService: SimulacionService
  ) {}

  ngOnInit(): void {
    this.cargarSimulacionesGuardadas();
  }

  private cargarSimulacionesGuardadas(): void {
    this.historialSimulacionesService.getMisProyecciones().subscribe({
      next: (data) => {
        this.simulacionesGuardadas = data;
      },
      error: (err) => console.error('Error al cargar simulaciones:', err)
    });
  }

  verSimulacion(simulacion: Proyeccion): void {
    const posibleId = (simulacion as any).id ?? (simulacion as any).proyeccionId ?? null;

    if (posibleId) {
      this.simulacionService.getSimulacionById(Number(posibleId)).subscribe({
        next: (resp) => {
          let resultado: any;
          const anyResp: any = resp as any;

          if (anyResp && Array.isArray(anyResp.materias)) {
            resultado = { '0': { materias: anyResp.materias } };
          } else if (anyResp && (anyResp.resultadoSimulacion || anyResp.resultado)) {
            resultado = anyResp.resultadoSimulacion ?? anyResp.resultado;
          } else {
            resultado = anyResp;
          }

          this.simulacionService.setSimulacion(resultado);
          const nombre = anyResp?.nombreSimulacion ?? (simulacion as any).nombreSimulacion ?? '';
          this.simulacionService.setNombreSimulacionActual(nombre);

          const jobId = anyResp?.jobId ?? (simulacion as any).jobId ?? null;
          if (jobId) {
            this.simulacionService.setJobIdSimulacionActual(jobId);
          } else {
            this.simulacionService.limpiarJobIdSimulacionActual();
          }

          this.router.navigate(['/simulaciones/mostrar']);
        },
        error: (err) => {
          this.simulacionService.setSimulacion(simulacion as any);
          this.simulacionService.setNombreSimulacionActual(simulacion.nombreSimulacion);
          if ((simulacion as any).jobId) {
            this.simulacionService.setJobIdSimulacionActual((simulacion as any).jobId);
          } else {
            this.simulacionService.limpiarJobIdSimulacionActual();
          }
          this.router.navigate(['/simulaciones/mostrar']);
        }
      });
    } else {
      // Si no hay id, usar la simulación local
      this.simulacionService.setSimulacion(simulacion as any);
      this.simulacionService.setNombreSimulacionActual(simulacion.nombreSimulacion);
      if ((simulacion as any).jobId) {
        this.simulacionService.setJobIdSimulacionActual((simulacion as any).jobId);
      } else {
        this.simulacionService.limpiarJobIdSimulacionActual();
      }
      this.router.navigate(['/simulaciones/mostrar']);
    }
  }

  eliminarSimulacion(simulacion: Proyeccion): void {
    this.simulacionAEliminar = simulacion;
    this.mostrarModalEliminar = true;
  }

  confirmarEliminacion(): void {
    if (this.simulacionAEliminar) {
      const id = (this.simulacionAEliminar as any).id; // id debe venir del backend
      this.historialSimulacionesService.eliminarProyeccion(id).subscribe({
        next: () => {
          this.cargarSimulacionesGuardadas();
        },
        error: (err) => console.error('Error al eliminar simulación:', err)
      });
    }
    this.mostrarModalEliminar = false;
    this.simulacionAEliminar = null;
  }

  limpiarHistorial(): void {
    this.mostrarModalLimpiar = true;
  }

  confirmarLimpiarHistorial(): void {
    this.historialSimulacionesService.limpiarProyecciones().subscribe({
      next: () => {
        this.cargarSimulacionesGuardadas();
        this.mostrarModalLimpiar = false;
      },
      error: (err) => console.error('Error al limpiar historial:', err)
    });
  }

  volverSimulacion(): void {
    this.router.navigate(['/simulaciones']);
  }

  formatearFecha(fecha?: Date | string): string {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearPriorizaciones(priorizaciones: boolean[] = []): string {
    return priorizaciones.some(p => p) ? priorizaciones.join(', ') : 'Ninguna';
  }

  getPriorizacionTexto(simulacion: any, index: number, valor: any): string {
    const paramsNombres: string[] | undefined = simulacion?.parametros?.priorizaciones;
    
    if (typeof valor === 'boolean') {
      const label = this.defaultPriorizacionesLabels[index] ?? `Criterio ${index + 1}`;
      return `${label}: ${valor ? 'Sí' : 'No'}`;
    }
    
    return `Criterio: ${index + 1}`;
}
}
