import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CierreCaja } from './cierre-caja';

describe('CierreCaja', () => {
  let component: CierreCaja;
  let fixture: ComponentFixture<CierreCaja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CierreCaja],
    }).compileComponents();

    fixture = TestBed.createComponent(CierreCaja);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
