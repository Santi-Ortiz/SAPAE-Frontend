import { TestBed } from '@angular/core/testing';

import { LecturaService } from './lectura.service';

describe('LecturaService', () => {
  let service: LecturaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LecturaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
