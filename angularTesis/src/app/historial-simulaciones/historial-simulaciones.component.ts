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
    // Cargar datos en el servicio de simulación
    this.simulacionService.setSimulacion(simulacion); 
    this.simulacionService.setNombreSimulacionActual(simulacion.nombreSimulacion);
    
    // Guardar el jobId si existe
    if ((simulacion as any).jobId) {
      this.simulacionService.setJobIdSimulacionActual((simulacion as any).jobId);
    } else {
      this.simulacionService.limpiarJobIdSimulacionActual();
    }
    
    // Navegar a la vista de resultado
    this.router.navigate(['/simulaciones/mostrar']);
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
}
