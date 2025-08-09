import { Materia } from "./materia.model";

export class Simulacion {
    constructor(
        public materias: Materia[] = [],
        public puntajeTotal?: number,
        public creditosTotales?: number
    ) { }

}