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
  cursosIA: Materia[] = [];
  cursosEnfasis: Materia[] = [];
  cursosElectivas: Materia[] = [];
  cursosDesarrolloComputacion: Materia[] = [];
  cursosDesarrolloGestion: Materia[] = [];
  cursosComputacionVisual: Materia[] = [];
  cursosSIGtoIA: Materia[] = [];
  cursosCVtoIA: Materia[] = [];
  cursosComplementariaInformacion: Materia[] = [];
  cursosComplementariaLenguas: Materia[] = [];
  cursosElectivaBasicas: Materia[] = [];
  mostrarTodasMaterias?: boolean;
}
