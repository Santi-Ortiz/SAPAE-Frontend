export class RegisterDTO {
    constructor(
        public codigo: string,
        public correo: string,
        public carrera: string,
        public contrasenia: string,
        public anioIngreso: number,
        public primerNombre: string,
        public primerApellido: string,
        public segundoApellido: string,
        public segundoNombre?: string
    ) { }
}
