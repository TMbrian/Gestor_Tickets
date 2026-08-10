/** Estados posibles del ciclo de vida de un ticket de soporte */
export type EstadoTicket = 'Abierto' | 'En Progreso' | 'Pausado' | 'Cerrado';

/**
 * Representa un ticket de soporte técnico dentro del sistema.
 * Contiene toda la información necesaria para su seguimiento,
 * desde la asignación hasta el cierre y métricas de resolución.
 */
export interface Ticket {
  /** Identificador único del documento en la base de datos (opcional al crear) */
  id?: string;

  /** Número de ticket visible para el usuario, usado como referencia humana */
  numeroTicket: string;

  /** Número de semana del año en que fue registrado el ticket */
  semana: number;

  /** Año ISO correspondiente a la fecha de asignación */
  anioISO?: number;

  /** Fecha de asignación del ticket en formato YYYY-MM-DD */
  fechaAsignacion: string;

  /** Hora de asignación del ticket en formato HH:mm */
  horaAsignacion: string;

  /** Fecha de cierre del ticket en formato YYYY-MM-DD; `null` si sigue abierto */
  fechaCierre: string | null;

  /** Hora de cierre del ticket en formato HH:mm; `null` si sigue abierto */
  horaCierre: string | null;

  /** Semana ISO del cierre; `null` si sigue abierto */
  semanaCierre?: number | null;

  /** Fecha en que se inició la atención/solución del ticket en formato YYYY-MM-DD */
  fechaInicioSolucion?: string | null;

  /** Hora en que se inició la atención/solución del ticket en formato HH:mm */
  horaInicioSolucion?: string | null;

  /** Semana ISO correspondiente a la fecha de inicio de solución */
  semanaInicioSolucion?: number | null;

  /**
   * Tiempo total de resolución expresado en minutos.
   * Se calcula automáticamente al registrar el cierre del ticket.
   */
  tiempoSolucionMins: number | null;

  /**
   * Tiempo total (en minutos) que el ticket ha permanecido en estado 'Pausado'.
   * Se descuenta del tiempo total de solución.
   */
  tiempoPausaMins?: number;

  /** Marca de tiempo (Unix ms) de cuando se inició la última pausa */
  ultimaPausaInicio?: number | null;

  /** Indica si el ticket ha sido asignado a un técnico o responsable */
  estaAsignado: boolean;

  /** Indica si el ticket corresponde a una Solicitud de Cambio (RFC) */
  esRfc: boolean;

  /** Número de RFC asociado; `null` si el ticket no es una RFC */
  numeroRfc: string | null;

  /** Sitio o sucursal donde se originó el ticket */
  sitio: string;

  /** Área funcional o departamento afectado por el incidente */
  areaAfectada: string;

  /** Descripción detallada del problema o solicitud reportada */
  descripcion: string;

  /** Estado actual del ticket dentro de su ciclo de vida */
  estado: EstadoTicket;

  /** Identificador del usuario propietario o creador del ticket */
  idUsuario: string;

  /** Marca de tiempo (Unix ms) de la creación del registro */
  creadoEn: number;

  /** Marca de tiempo (Unix ms) de la última actualización del registro */
  actualizadoEn: number;

  /**
   * Token de concurrencia optimista (RowVersion) asignado por el backend SQL.
   * `undefined` en la implementación Firestore (no aplica concurrencia optimista);
   * poblado por `ApiTicketRepository` en la Fase 4 a partir del `RowVersion` del backend.
   */
  rowVersion?: string;
}

/**
 * Estadísticas agregadas calculadas sobre un conjunto de tickets.
 * Usadas para mostrar métricas en el tablero y reportes de rendimiento.
 */
export interface EstadisticasTicket {
  /** Total de tickets considerados en el cálculo */
  total: number;

  /** Conteo de tickets agrupados por cada estado del ciclo de vida */
  porEstado: { [clave in EstadoTicket]?: number };

  /** Promedio del tiempo de resolución en minutos de los tickets cerrados */
  promedioTiempoSolucionMins: number;
}

/**
 * Representa un sitio o ubicación física registrada en el sistema.
 * Los tickets se asocian a un sitio para identificar su origen geográfico.
 */
export interface Sitio {
  /** Identificador único del sitio en la base de datos (opcional al crear) */
  id?: string;

  /** Nombre descriptivo del sitio o sucursal */
  nombre: string;

  /** Identificador del usuario propietario del sitio */
  idUsuario: string;

  /** Marca de tiempo (Unix ms) de la creación del registro */
  creadoEn: number;
}

/**
 * Representa un área funcional o departamento dentro de un sitio.
 * Permite clasificar los tickets según la unidad organizacional afectada.
 */
export interface Area {
  /** Identificador único del área en la base de datos (opcional al crear) */
  id?: string;

  /** Nombre descriptivo del área o departamento */
  nombre: string;

  /** Identificador del usuario propietario del área */
  idUsuario: string;

  /** Marca de tiempo (Unix ms) de la creación del registro */
  creadoEn: number;
}