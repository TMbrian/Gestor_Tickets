import { UtilidadesFecha } from './utilidades-fecha';

describe('UtilidadesFecha QA', () => {
  describe('Cálculos normales (Lunes a Viernes)', () => {
    it('Debe calcular correctamente la semana ISO 19 y año 2026 para un Lunes de mayo 2026', () => {
      // 4 de Mayo de 2026 es Lunes, semana 19
      const fechaLunes = new Date('2026-05-04T12:00:00');
      expect(UtilidadesFecha.calcularSemanaISO(fechaLunes)).toBe(19);
      expect(UtilidadesFecha.calcularAnioISO(fechaLunes)).toBe(2026);
    });
  });

  describe('Reglas de Negocio ADR-001 (Desplazamientos de Fin de Semana)', () => {
    it('[Sábado] 4 de Enero 2025 debe desplazarse y contar como Lunes 6 (Semana 2 de 2025)', () => {
      const fechaSabado = new Date('2025-01-04T12:00:00');
      expect(UtilidadesFecha.calcularSemanaISO(fechaSabado)).toBe(2);
      expect(UtilidadesFecha.calcularAnioISO(fechaSabado)).toBe(2025);
    });

    it('[Domingo] 29 de Diciembre 2024 debe desplazarse y contar como Lunes 30 (Semana 1 de 2025)', () => {
      const fechaDomingo = new Date('2024-12-29T12:00:00');
      expect(UtilidadesFecha.calcularSemanaISO(fechaDomingo)).toBe(1);
      expect(UtilidadesFecha.calcularAnioISO(fechaDomingo)).toBe(2025);
    });
  });

  describe('Casos Límite y de Bisiesto', () => {
    it('Martes 31 de Diciembre de 2024 (Año bisiesto) pertenece a la Semana 1 del año 2025', () => {
      const finDeAnio = new Date('2024-12-31T12:00:00');
      expect(UtilidadesFecha.calcularSemanaISO(finDeAnio)).toBe(1);
      expect(UtilidadesFecha.calcularAnioISO(finDeAnio)).toBe(2025);
    });

    it('Jueves 1 de Enero de 2026 pertenece a la Semana 1 del año 2026', () => {
      const primeroEnero = new Date('2026-01-01T12:00:00');
      expect(UtilidadesFecha.calcularSemanaISO(primeroEnero)).toBe(1);
      expect(UtilidadesFecha.calcularAnioISO(primeroEnero)).toBe(2026);
    });
  });
});
