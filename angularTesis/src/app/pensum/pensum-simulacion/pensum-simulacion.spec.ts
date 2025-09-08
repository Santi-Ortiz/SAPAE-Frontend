import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PensumSimulacion } from './pensum-simulacion';

describe('PensumSimulacion', () => {
  let component: PensumSimulacion;
  let fixture: ComponentFixture<PensumSimulacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PensumSimulacion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PensumSimulacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
