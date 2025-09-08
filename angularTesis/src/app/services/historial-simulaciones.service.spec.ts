import { TestBed } from '@angular/core/testing';

import { HistorialSimulacionesService } from './historial-simulaciones.service';

describe('HistorialSimulacionesService', () => {
  let service: HistorialSimulacionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistorialSimulacionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
