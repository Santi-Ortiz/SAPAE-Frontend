
// ---- Nombre Anterior: ProyeccionDTO ----
export class Proyeccion {
    constructor(
        public id: number,
        public semestre: number,
        public creditos: number,
        public materias: number,
        public nombreSimulacion: string,
        public tipoMatricula: string,
        public practicaProfesional: boolean,
        public fechaCreacion?: Date | string, // Opcional porque se crea en el backend
        public priorizaciones: boolean[] = [],
    ) { }
}