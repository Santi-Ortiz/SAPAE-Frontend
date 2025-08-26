import { Materia } from "./materia.model";
import { Proyeccion } from "./proyeccion.model";
import { SimulacionMateria } from "./simulacion_materia.model";

export class Simulacion {
    constructor(
        public id: number,
        public materiasAsociadas: SimulacionMateria[] = [],
        public semestre: number,
        public creditosTotales?: number,
        public proyeccion?: Proyeccion
    ) { }

}