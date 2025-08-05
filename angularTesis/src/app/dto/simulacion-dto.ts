import { ProgresoDTO } from "./progreso-dto";
import { ProyeccionDTO } from "./proyeccion-dto";

export class SimulacionDTO{
    constructor(
        public progreso?: ProgresoDTO,
        public proyeccion?: ProyeccionDTO,
        public priorizaciones?: boolean[]
    ) {

    }
}