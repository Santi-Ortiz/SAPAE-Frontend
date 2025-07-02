import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PensumView } from './pensum-view';

describe('PensumView', () => {
  let component: PensumView;
  let fixture: ComponentFixture<PensumView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PensumView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PensumView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
