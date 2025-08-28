import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimulacionComponent } from './simulacion';

describe('SimulacionComponent', () => {
  let component: SimulacionComponent;
  let fixture: ComponentFixture<SimulacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimulacionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimulacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
