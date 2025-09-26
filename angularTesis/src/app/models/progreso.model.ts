import { MateriaDTO } from '../dtos/materia-dto';
import { Materia } from './materia.model';

// ---- Nombre Anterior: ProgresoDTO ----
export class Progreso {
  promedio?: number;
  materias: MateriaDTO[] = [];
  materiasCursadas?: number;
  materiasFaltantes?: number;
  materiasCursando?: number;
  creditosCursando?: number;
  creditosCursados?: number;
  creditosFaltantes?: number;
  porcentaje?: number;
  semestre?: number;
  faltanElectiva?: number;
  faltanComplementaria?: number;
  faltanEnfasis?: number;
  faltanElectivaBasicas?: number;
  lineasRequisitosGrado?: string[];
  listaMateriasFaltantes?: Materia[] = [];
  archivoSeleccionado?: File;
  error?: string;
  cursosElectivas: MateriaDTO[] = [];
  cursosEnfasis: MateriaDTO[] = [];
  cursosComplementariaLenguas: MateriaDTO[] = [];
  cursosComplementariaInformacion: MateriaDTO[] = [];
  cursosIA: MateriaDTO[] = [];
  cursosDesarrolloComputacion: MateriaDTO[] = [];
  cursosDesarrolloGestion: MateriaDTO[] = [];
  cursosComputacionVisual: MateriaDTO[] = [];
  cursosCVtoIA: MateriaDTO[] = [];
  cursosSIGtoIA: MateriaDTO[] = [];
  cursosElectivaBasicas: MateriaDTO[] = [];
  cursosSeguridad: MateriaDTO[] = [];
  mostrarTodasMaterias?: boolean;

  constructor() {
    this.materias = this.materias || [];
    this.listaMateriasFaltantes = this.listaMateriasFaltantes || [];
    this.cursosElectivas = this.cursosElectivas || [];
    this.cursosEnfasis = this.cursosEnfasis || [];
    this.cursosComplementariaLenguas = this.cursosComplementariaLenguas || [];
    this.cursosComplementariaInformacion = this.cursosComplementariaInformacion || [];
    this.cursosIA = this.cursosIA || [];
    this.cursosDesarrolloComputacion = this.cursosDesarrolloComputacion || [];
    this.cursosDesarrolloGestion = this.cursosDesarrolloGestion || [];
    this.cursosComputacionVisual = this.cursosComputacionVisual || [];
    this.cursosCVtoIA = this.cursosCVtoIA || [];
    this.cursosSIGtoIA = this.cursosSIGtoIA || [];
    this.cursosElectivaBasicas = this.cursosElectivaBasicas || [];
    this.cursosSeguridad = this.cursosSeguridad || [];
  }
}