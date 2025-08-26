import { Facultad } from "./facultad.model";
import { Pensum } from "./pensum.model";

export class Estudiante {
    constructor(
        public id: number,
        public codigo: string,
        public correo: string,
        public contrasenia: string,
        public primerNombre: string,
        public carrera: string,
        public anioIngreso: number,
        public segundoNombre?: string,
        public primerApellido?: string,
        public segundoApellido?: string,
        public pensum?: Pensum,
        public facultad?: Facultad) {

    }
}