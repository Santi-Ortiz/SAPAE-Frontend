import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialSimulacionesComponent } from './historial-simulaciones.component';

describe('HistorialSimulacionesComponent', () => {
  let component: HistorialSimulacionesComponent;
  let fixture: ComponentFixture<HistorialSimulacionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialSimulacionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialSimulacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
