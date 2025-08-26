export class EstudianteDTO {
    codigo!: string;
    correo!: string;
    contrasenia!: string;
    primerNombre!: string;
    segundoNombre?: string;
    primerApellido!: string;
    segundoApellido!: string;
    carrera!: string;
    anioIngreso!: number;
    pensumId?: number;
    facultadId?: number;
}