import { MateriaDTO } from './materia-dto';
import { MateriajsonDTO } from './materiajson-dto';

export class ProgresoDTO {
  materias: MateriaDTO[] = []; 
  materiasCursadas?: number;
  materiasCursando?: number;
  materiasFaltantes?: number;
  promedio?: number;
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
}
