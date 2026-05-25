/** Utilidad de impresión con window.print() y estilos @media print globales. */
export type ModoImpresionReporte = 'jornada' | 'historial-cierres' | 'historial-ventas' | 'todo';

export class ImpresionReporteUtil {
  static imprimir(modo: ModoImpresionReporte = 'todo'): void {
    document.body.classList.add('modo-impresion-reporte');
    if (modo !== 'todo') {
      document.body.classList.add(`impresion-${modo}`);
    }
    window.print();
    // Retraso para que el diálogo de impresión termine antes de quitar las clases
    setTimeout(() => {
      document.body.classList.remove('modo-impresion-reporte');
      if (modo !== 'todo') {
        document.body.classList.remove(`impresion-${modo}`);
      }
    }, 1500);
  }
}
