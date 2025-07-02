import { TestBed } from '@angular/core/testing';

import { PensumService } from './pensum.service';

describe('Pensum', () => {
  let service: PensumService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PensumService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
