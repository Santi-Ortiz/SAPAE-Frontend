import { MateriaDTO } from './materia-dto';
import { MateriajsonDTO } from './materiajson-dto';

export class ProgresoDTO {
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
  listaMateriasFaltantes?: MateriajsonDTO[]= [];
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
  mostrarTodasMaterias?: boolean;
}
