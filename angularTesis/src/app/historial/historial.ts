import { Component, AfterViewInit, OnInit } from '@angular/core';
import { Progreso } from '../models/progreso.model';
import { RouterModule } from '@angular/router';
import { NgIf, NgFor, NgClass, } from '@angular/common';
import * as d3 from 'd3';
import { HistorialService } from '../services/historial.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [RouterModule, NgIf, NgFor, NgClass,],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})
export class Historial implements OnInit, AfterViewInit {
  public historial: Progreso = new Progreso();
  public tablasExtra: { titulo: string; lista: any[] }[] = [];
  constructor(private historialService: HistorialService) { };
  mostrarTodasMaterias = false;

  ngOnInit() {
    const data = this.historialService.getHistorial();
    console.log('Datos recibidos del backend:', data);
    if (data) {
      this.historial = data;
      this.tablasExtra = [
        { titulo: 'Electivas Universidad', lista: this.historial.cursosElectivas },
        { titulo: 'Énfasis', lista: this.historial.cursosEnfasis },
        { titulo: 'Complementarias', lista: this.historial.cursosComplementariaLenguas },
        { titulo: 'Complementaria Información', lista: this.historial.cursosComplementariaInformacion },
        { titulo: 'Complementaria Ciencia Política', lista: this.historial.cursosComplementariaCienciaPolitica },
        { titulo: 'Complementaria Estética', lista: this.historial.cursosComplementariaEstetica },
        { titulo: 'Énfasis validado como Complementaria (IA)', lista: this.historial.cursosIA },
        { titulo: 'Énfasis Computación', lista: this.historial.cursosDesarrolloComputacion },
        { titulo: 'Énfasis Gestión', lista: this.historial.cursosDesarrolloGestion },
        { titulo: 'Énfasis Computación Visual', lista: this.historial.cursosComputacionVisual },
        { titulo: 'CV validado como IA', lista: this.historial.cursosCVtoIA },
        { titulo: 'SIG validado como IA', lista: this.historial.cursosSIGtoIA },
        { titulo: 'Electiva de Ciencias Básicas', lista: this.historial.cursosElectivaBasicas },
        { titulo: 'Seguridad', lista: this.historial.cursosSeguridad }
      ];
    }

  }

  ngAfterViewInit() {

  }


  get requisitosProcesados() {
    return this.historial.lineasRequisitosGrado
      ?.filter(linea =>
        !linea.includes('Condición general no satisfecha: Requisitos de grado') &&
        !linea.includes('Condición general satisfecha: Requisitos de grado') &&
        !linea.includes('Satisfecho: Requisitos de grado')
      )
      .map(linea => {
        const partes = linea.split('/');
        const nombre = partes[0]?.trim() || '';
        const estado = partes[1]?.trim().toLowerCase() || '';
        const cumplido = estado.includes('satisfecho') && !estado.includes('no');

        return {
          nombre,
          cumplido
        };
      }) || [];
  }

  get materiasVisibles() {
    return this.mostrarTodasMaterias
      ? this.historial.materias
      : this.historial.materias.slice(0, 5);
  }


}
