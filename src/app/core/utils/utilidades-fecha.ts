export class DateUtils {
  static calculateISOWeek(d: Date): number {
    // Trabajamos con una copia para no modificar el original
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // ISO: la semana empieza el lunes. El jueves define a qué año pertenece la semana.
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  static getTodayDateString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  }

  static getTodayTimeString(): string {
    return new Date().toTimeString().slice(0, 5);
  }
}
