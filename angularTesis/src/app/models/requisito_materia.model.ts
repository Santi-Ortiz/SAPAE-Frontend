import { Materia } from "./materia.model";

export class RequisitoMateria {
    constructor(
        public id: number,
        public materia: Materia,
        public materiaRequisito: Materia
    ) {}
}
