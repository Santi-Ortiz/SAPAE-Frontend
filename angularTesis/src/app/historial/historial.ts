import { Component } from '@angular/core';
import { MateriaDTO } from '../../app/dto/materia-dto';
import { RouterModule } from '@angular/router';
import { LecturaService } from '../shared/lectura.service';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIf, NgFor, NgClass, AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [RouterModule, NgIf, NgFor, NgClass, AsyncPipe],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})

export class Historial {
  materias: MateriaDTO[] = [];
  bloques: any[] = [];
  promedio: number = 0;
  porcentaje: number = 0;
  materiasCursadas: number = 0;
  materiasCursando: number = 0;
  materiasFaltantes: number = 0;
  faltanElectiva: number = 0;
  faltanComplementaria: number = 0;
  faltanEnfasis: number = 0;
  faltanElectivaBasicas: number = 0;
  listaMateriasFaltantes: string[] = [];
  lineasRequisitosGrado: string[] = [];
  error: string = '';
  archivoSeleccionado!: File;

  constructor(private lecturaService: LecturaService) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.archivoSeleccionado = file;
    } else {
      this.error = 'Debe seleccionar un archivo PDF válido.';
    }
  }
  
  onSubmit(): void {
    if (!this.archivoSeleccionado) {
      this.error = 'Primero seleccione un archivo PDF.';
      return;
    }
  
    this.lecturaService.subirArchivo(this.archivoSeleccionado).subscribe({
      next: (respuesta) => {
        this.materias = respuesta.materias;
        this.bloques = respuesta.bloques || [];
        this.promedio = respuesta.promedio || 0;
        this.porcentaje = respuesta.porcentaje || 0;
        this.materiasCursadas = respuesta.materiasCursadas || 0;
        this.materiasCursando = respuesta.materiasCursando || 0;
        this.materiasFaltantes = respuesta.materiasFaltantes || 0;
        this.faltanElectiva = respuesta.faltanElectiva || 0;
        this.faltanComplementaria = respuesta.faltanComplementaria || 0;
        this.faltanEnfasis = respuesta.faltanEnfasis || 0;
        this.faltanElectivaBasicas = respuesta.faltanElectivaBasicas || 0;
        this.listaMateriasFaltantes = respuesta.listaMateriasFaltantes || [];
        this.lineasRequisitosGrado = respuesta.lineasRequisitosGrado || [];
        this.error = '';
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al procesar el archivo.';
      }
    });
  }
  
}
