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
  cursosIA: MateriajsonDTO[] = [];
  cursosEnfasis: MateriajsonDTO[] = [];
  cursosElectivas: MateriajsonDTO[] = [];
  cursosDesarrolloComputacion: MateriajsonDTO[] = [];
  cursosDesarrolloGestion: MateriajsonDTO[] = [];
  cursosComputacionVisual: MateriajsonDTO[] = [];
  cursosSIGtoIA: MateriajsonDTO[] = [];
  cursosCVtoIA: MateriajsonDTO[] = [];
  cursosComplementariaInformacion: MateriajsonDTO[] = [];
  cursosComplementariaLenguas: MateriajsonDTO[] = [];
  cursosElectivaBasicas: MateriajsonDTO[] = [];
  mostrarTodasMaterias?: boolean;
}
