import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimulacionResultado } from './simulacion-resultado';

describe('SimulacionResultado', () => {
  let component: SimulacionResultado;
  let fixture: ComponentFixture<SimulacionResultado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimulacionResultado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimulacionResultado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
