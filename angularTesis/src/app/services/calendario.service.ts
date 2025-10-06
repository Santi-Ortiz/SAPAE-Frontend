import { Injectable } from '@angular/core';
import { CalendarioAcademico } from '../dtos/calendario-dto';

@Injectable({
  providedIn: 'root'
})
export class CalendarioService {

  /* Se genera el objeto a partir de calendario-dto */
  private calendarioAcademico: CalendarioAcademico = {
    año: 2025,
    periodos: {
      '10': {
        inicioClases: '2025-01-27',
        finClases: '2025-06-07',
        recesos: [
          { inicio: '2025-04-14', fin: '2025-04-18', nombre: 'Semana Santa' },
        ]
      }, '20': {
        inicioClases: '2025-01-27',
        finClases: '2025-06-07',
        recesos: [
        ]
      },
      '30': {
        inicioClases: '2025-07-21',
        finClases: '2025-11-29',
        recesos: [
          { inicio: '2025-09-15', fin: '2025-09-21', nombre: 'Semana de Reflexión' },
        ]
      }
    }
  };

  /* Obtiene la información de la semana académica */
  getSemanaActual() {
    const hoy = new Date();
    const añoActual = hoy.getFullYear();

    for (const [periodoKey, periodo] of Object.entries(this.calendarioAcademico.periodos)) {
      const inicioClases = new Date(periodo.inicioClases);
      const finClases = new Date(periodo.finClases);

      if (hoy >= inicioClases && hoy <= finClases) {
        return this.calcularSemanaEnSemestre(hoy, periodo, `${añoActual}-${periodoKey}`);
      }
    }

    return null;
  }

  /* Calcula la semana en el semestre */
  private calcularSemanaEnSemestre(fecha: Date, semestreConfig: any, periodo: string) {
    const inicioClases = new Date(semestreConfig.inicioClases);

    for (const receso of semestreConfig.recesos) {
      const inicioReceso = new Date(receso.inicio);
      const finReceso = new Date(receso.fin);

      if (fecha >= inicioReceso && fecha <= finReceso) {
        return {
          numero: 0,
          descripcion: `Receso: ${receso.nombre}`,
          periodo,
          fechaInicio: inicioReceso,
          fechaFin: finReceso,
          esReceso: true
        };
      }
    }

    // Se calcula la semana académica
    const diasDesdeInicio = Math.floor((fecha.getTime() - inicioClases.getTime()) / (1000 * 60 * 60 * 24));
    const semanaCalculada = Math.floor(diasDesdeInicio / 7) + 1;

    // Se ajusta por recesos anteriores
    let semanasRecesoAnteriores = 0;
    for (const receso of semestreConfig.recesos) {
      if (fecha > new Date(receso.fin)) {
        semanasRecesoAnteriores++;
      }
    }

    const numeroSemana = semanaCalculada - semanasRecesoAnteriores;
    const finClases = new Date(semestreConfig.finClases);
    let descripcion: string;


    if (fecha <= finClases) {
      descripcion = `Semana ${numeroSemana} académica`;
    } else {
      descripcion = 'Periodo de vacaciones';
    } 

    return {
      numero: numeroSemana,
      descripcion,
      periodo,
      fechaInicio: this.obtenerInicioSemana(fecha),
      fechaFin: this.obtenerFinSemana(fecha),
      esReceso: false
    };
  }

  /* Se obtiene el inicio de la semana */
  private obtenerInicioSemana(fecha: Date): Date {
    const fechaCopia = new Date(fecha);
    const dia = fechaCopia.getDay();
    const diferencia = fechaCopia.getDate() - dia + (dia === 0 ? -6 : 1);
    fechaCopia.setDate(diferencia);
    return fechaCopia;
  }

  /* Se obtiene el fin de la semana */
  private obtenerFinSemana(fecha: Date): Date {
    const inicioSemana = this.obtenerInicioSemana(fecha);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(finSemana.getDate() + 6);
    return finSemana;
  }
}
