import { TestBed } from '@angular/core/testing';

import { PensumMateriaService } from './pensum-materia.service';

describe('PensumMateriaService', () => {
  let service: PensumMateriaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PensumMateriaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
