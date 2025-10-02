export interface SimulacionJobStatus {
  jobId: string;
  estado: string;
  mensaje: string;
  nombre: string;
  tiempoDuracion?: number;
  error?: string;
  cargando?: boolean;
}
