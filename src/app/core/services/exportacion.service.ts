import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Ticket } from '../models/ticket.modelo';

/**
 * Servicio para la exportación e importación de datos de tickets
 * en formatos de hoja de cálculo (Excel y CSV).
 *
 * Utiliza la librería `xlsx` para la generación y lectura de archivos,
 * sin depender de ningún servidor externo; todo el procesamiento es local.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioExportacion {

  /**
   * Exporta un listado de tickets a un archivo Excel (.xlsx)
   * y lo descarga automáticamente en el navegador.
   *
   * @param datos          - Arreglo de tickets a exportar.
   * @param nombreArchivo  - Nombre base del archivo sin extensión (por defecto: 'tickets_export').
   */
  exportarAExcel(datos: Ticket[], nombreArchivo: string = 'tickets_export'): void {
    const hojaDeTrabajo: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const libroDeTrabajo: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libroDeTrabajo, hojaDeTrabajo, 'Tickets');
    XLSX.writeFile(libroDeTrabajo, `${nombreArchivo}.xlsx`);
  }

  /**
   * Exporta un listado de tickets a un archivo CSV y lo descarga
   * automáticamente en el navegador mediante un enlace temporal.
   *
   * @param datos         - Arreglo de tickets a exportar.
   * @param nombreArchivo - Nombre base del archivo sin extensión (por defecto: 'tickets_export').
   */
  exportarACSV(datos: Ticket[], nombreArchivo: string = 'tickets_export'): void {
    const hojaDeTrabajo: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const contenidoCSV = XLSX.utils.sheet_to_csv(hojaDeTrabajo);

    // Creación del blob con codificación UTF-8 para preservar caracteres especiales
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const urlTemporal = URL.createObjectURL(blob);

    // Enlace temporal en el DOM para disparar la descarga del archivo
    const enlaceDescarga = document.createElement('a');
    enlaceDescarga.href = urlTemporal;
    enlaceDescarga.download = `${nombreArchivo}.csv`;
    enlaceDescarga.click();

    // Liberación del objeto URL para evitar fugas de memoria
    URL.revokeObjectURL(urlTemporal);
  }

  /**
   * Importa datos desde un archivo Excel (.xlsx o .xls) seleccionado por el usuario.
   *
   * Lee la primera hoja del libro y convierte su contenido a un arreglo de objetos JSON.
   * Los valores se leen como texto formateado (`raw: false`) para preservar fechas y formatos.
   *
   * @param archivo - Objeto `File` del archivo Excel seleccionado por el usuario.
   * @returns Promesa que resuelve con los datos de la primera hoja como arreglo de objetos.
   */
  importarDesdeExcel(archivo: File): Promise<any[]> {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();

      lector.onload = (evento: any) => {
        try {
          const bytesArchivo = new Uint8Array(evento.target.result);
          const libroDeTrabajo = XLSX.read(bytesArchivo, { type: 'array' });

          // Se toma siempre la primera hoja disponible del libro
          const nombrePrimeraHoja = libroDeTrabajo.SheetNames[0];
          const primeraHoja = libroDeTrabajo.Sheets[nombrePrimeraHoja];

          // `raw: false` garantiza que fechas y valores formateados lleguen como texto
          const datosJSON = XLSX.utils.sheet_to_json(primeraHoja, { raw: false });
          resolver(datosJSON);
        } catch (error) {
          rechazar(error);
        }
      };

      lector.onerror = (error) => rechazar(error);
      lector.readAsArrayBuffer(archivo);
    });
  }
}