import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturaPrint } from './factura-print';

describe('FacturaPrint', () => {
  let component: FacturaPrint;
  let fixture: ComponentFixture<FacturaPrint>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturaPrint],
    }).compileComponents();

    fixture = TestBed.createComponent(FacturaPrint);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
