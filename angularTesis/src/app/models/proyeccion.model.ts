
// ---- Nombre Anterior: ProyeccionDTO ----
export class Proyeccion {
    constructor(
        public semestre: number,
        public numMaxCreditos: number,
        public numMaxMaterias: number,
        public nombreSimulacion: string,
        public tipoMatricula: string,
        public practicaProfesional: boolean,
        public fechaCreacion?: Date | string, // Opcional porque se crea en el backend
        public priorizaciones: boolean[] = [],
    ) { }
}