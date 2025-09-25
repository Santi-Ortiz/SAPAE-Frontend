import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecomendacionesSelectorComponent } from './recomendaciones-selector.component';

describe('RecomendacionesSelectorComponent', () => {
  let component: RecomendacionesSelectorComponent;
  let fixture: ComponentFixture<RecomendacionesSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecomendacionesSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecomendacionesSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
