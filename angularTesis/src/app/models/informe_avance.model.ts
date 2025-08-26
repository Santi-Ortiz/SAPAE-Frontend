import { Estudiante } from "./estudiante.model";
import { Pensum } from "./pensum.model";

export class InformeAvance {
    constructor(
        public id: number,
        public nombreArchivo: string,
        public archivo: File,
        public fechaPublicacion: Date,
        public estudiante: Estudiante,
        public pensum: Pensum
    ) {}
}