import { Progreso } from "../models/progreso.model";
import { Proyeccion } from "../models/proyeccion.model";

export class SimulacionDTO {
    constructor(
        public progreso?: Progreso,
        public proyeccion?: Proyeccion,
        public priorizaciones?: boolean[],
        public practicaProfesional?: boolean
    ) {

    }
}