export class MateriaDTO {
    constructor(
        public cicloLectivo: string,
        public materia: string,
        public numeroCat: string,
        public curso: string,
        public titulo: string,
        public calif: string,
        public cred: number,
        public tipo: string,
    ){}
}
