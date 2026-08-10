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
    // Se trabaja con una copia local para no mutar el objeto original
    const d = new Date(fecha);

    // Regla de Negocio: Sábado (6) y Domingo (0) se mueven al Lunes siguiente
    const diaDelAnio = d.getDay();
    if (diaDelAnio === 6) { // Sábado
      d.setDate(d.getDate() + 2);
    } else if (diaDelAnio === 0) { // Domingo
      d.setDate(d.getDate() + 1);
    }

    // Se trabaja con una copia en UTC para el cálculo ISO
    const fechaUTC = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

    // ISO 8601: el jueves de cada semana determina a qué año pertenece.
    const diaSemana = fechaUTC.getUTCDay() || 7;
    fechaUTC.setUTCDate(fechaUTC.getUTCDate() + 4 - diaSemana);

    const inicioDeTAnio = new Date(Date.UTC(fechaUTC.getUTCFullYear(), 0, 1));
    return Math.ceil((((fechaUTC.getTime() - inicioDeTAnio.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Calcula el Año ISO 8601 correspondiente a una fecha dada.
   * Aplica la misma regla de negocio de desplazar el fin de semana.
   */
  static calcularAnioISO(fecha: Date): number {
    const d = new Date(fecha);
    const diaDelAnio = d.getDay();
    if (diaDelAnio === 6) { d.setDate(d.getDate() + 2); } 
    else if (diaDelAnio === 0) { d.setDate(d.getDate() + 1); }

    const fechaUTC = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const diaSemana = fechaUTC.getUTCDay() || 7;
    fechaUTC.setUTCDate(fechaUTC.getUTCDate() + 4 - diaSemana);

    return fechaUTC.getUTCFullYear();
  }

  /**
   * Parsea una fecha en formato `YYYY-MM-DD` como fecha LOCAL, nunca UTC.
   *
   * `new Date('YYYY-MM-DD')` (sin componente de hora) se interpreta como UTC
   * medianoche según el spec de JS — en timezones detrás de UTC (ej. México,
   * UTC-6) eso corre el día calendario un día hacia atrás al pedir
   * `.getDay()`/`.getDate()` en hora local (un sábado pasa a leerse como
   * viernes). Esto rompe silenciosamente el desplazamiento de fin de semana
   * de `calcularSemanaISO`/`calcularAnioISO` (ADR-0001): un ticket asignado
   * en sábado dejaba de correrse a la semana siguiente porque la función
   * nunca detectaba que el día fuera sábado.
   *
   * Usar SIEMPRE esta función (o el mismo patrón de desestructuración) en
   * vez de `new Date(fechaStr)` para cualquier fecha-string sin hora antes
   * de pasarla a `calcularSemanaISO`/`calcularAnioISO`.
   *
   * @param fechaStr - Fecha en formato `YYYY-MM-DD`.
   * @returns `Date` construida en hora local, o `Invalid Date` si el string
   *          no tiene el formato esperado (igual que `new Date()` nativo).
   */
  static parsearFechaLocal(fechaStr: string): Date {
    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
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