import { Materia } from "./materia.model";
import { Simulacion } from "./simulacion.model";

export class SimulacionMateria {
    constructor(
        public id: number,
        public materia: Materia,
        public simulacion?: Simulacion
    ) {}
}