import { TestBed } from '@angular/core/testing';

import { Simulacion } from '../shared/simulacion.service';

describe('Simulacion', () => {
  let service: Simulacion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Simulacion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
