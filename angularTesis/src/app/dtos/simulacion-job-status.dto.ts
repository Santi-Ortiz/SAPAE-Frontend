export interface SimulacionJobStatus {
  jobId: string;
  estado: string;
  mensaje: string;
  tiempoDuracion?: number;
  error?: string;
}
