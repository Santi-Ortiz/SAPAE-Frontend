// ---- Nombre anterior: MateriaJsonDTO ----
export class Materia {
    constructor(
        public codigo: string,
        public nombre: string,
        public creditos: number,
        public semestre?: number,
        public requisitos?: string[],
        public tipo?: string
    ) { }
}
