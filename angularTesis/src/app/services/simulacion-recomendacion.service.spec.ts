import { TestBed } from '@angular/core/testing';

import { SimulacionRecomendacionService } from './simulacion-recomendacion.service';

describe('SimulacionRecomendacionService', () => {
  let service: SimulacionRecomendacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SimulacionRecomendacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
