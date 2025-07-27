import { TestBed } from '@angular/core/testing';

import { ProyeccionService } from './proyeccion.service';

describe('ProyeccionService', () => {
  let service: ProyeccionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProyeccionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
