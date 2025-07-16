export class MateriajsonDTO {
    constructor(
        public codigo: string,
        public nombre: string,
        public creditos: number,
        public semestre?: number,
        public requisitos?: string[]
    ) {}
}
