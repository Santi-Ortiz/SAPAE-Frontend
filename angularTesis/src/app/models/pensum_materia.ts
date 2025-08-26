import { Materia } from "./materia.model";
import { Pensum } from "./pensum.model";

export class PensumMateria {
    constructor(
        public id: number,
        public pensum: Pensum,
        public materia: Materia,
        public semestreEsperado: number
    ) {}
}