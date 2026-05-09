/**
 * Utilidades estáticas para el manejo y formateo de fechas en la aplicación.
 *
 * Provee métodos para el cálculo de semanas ISO 8601 y la obtención
 * de la fecha y hora actuales en los formatos requeridos por el sistema.
 */
export class UtilidadesFecha {

  /**
   * Calcula el número de semana ISO 8601 correspondiente a una fecha dada.
   *
   * Según el estándar ISO 8601, la semana comienza el lunes y la primera semana
   * del año es aquella que contiene el primer jueves. El cálculo se realiza en
   * UTC para evitar distorsiones por zonas horarias.
   *
   * @param fecha - Objeto `Date` del que se quiere obtener la semana ISO.
   * @returns Número de semana ISO (1-53).
   */
  static calcularSemanaISO(fecha: Date): number {
    // Se trabaja con una copia en UTC para no mutar el objeto original
    const fechaUTC = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));

    // ISO 8601: el jueves de cada semana determina a qué año pertenece.
    // Se ajusta la fecha al jueves de esa semana (|| 7 convierte el 0 del domingo a 7).
    const diaSemana = fechaUTC.getUTCDay() || 7;
    fechaUTC.setUTCDate(fechaUTC.getUTCDate() + 4 - diaSemana);

    // Se calcula cuántos días han pasado desde el 1 de enero del año de esa semana
    const inicioDeTAnio = new Date(Date.UTC(fechaUTC.getUTCFullYear(), 0, 1));
    return Math.ceil((((fechaUTC.getTime() - inicioDeTAnio.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Retorna la fecha actual del sistema en formato `YYYY-MM-DD`.
   * Formato requerido por los campos `fechaAsignacion` y `fechaCierre` del modelo `Ticket`.
   *
   * @returns Cadena con la fecha de hoy en formato ISO local (sin zona horaria).
   */
  static obtenerFechaHoy(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const dia = hoy.getDate().toString().padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  /**
   * Retorna la hora actual del sistema en formato `HH:mm`.
   * Formato requerido por los campos `horaAsignacion` y `horaCierre` del modelo `Ticket`.
   *
   * @returns Cadena con la hora actual en formato de 24 horas.
   */
  static obtenerHoraActual(): string {
    return new Date().toTimeString().slice(0, 5);
  }
}