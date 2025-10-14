import { Materia } from "./materia.model";
import { Proyeccion } from "./proyeccion.model";
import { SimulacionMateria } from "./simulacion_materia.model";

export class Simulacion {
    constructor(
        public materias: Materia[] = [],
        public puntajeTotal?: number,
        public creditosTotales?: number
    ) { }

}