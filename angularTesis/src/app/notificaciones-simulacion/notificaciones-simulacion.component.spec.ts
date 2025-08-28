import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificacionesSimulacionComponent } from './notificaciones-simulacion.component';

describe('NotificacionesSimulacionComponent', () => {
  let component: NotificacionesSimulacionComponent;
  let fixture: ComponentFixture<NotificacionesSimulacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificacionesSimulacionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificacionesSimulacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
