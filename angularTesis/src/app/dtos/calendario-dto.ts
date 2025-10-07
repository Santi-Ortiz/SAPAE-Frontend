export interface CalendarioAcademico {
    año: number;
    periodos: {
        [key: string]: {
            inicioClases: string; // Formato de la fecha: 'YYYY-MM-DD'
            finClases: string; // Formato de la fecha: 'YYYY-MM-DD'
            recesos: { inicio: string, fin: string, nombre: string }[];
        }
    }
}