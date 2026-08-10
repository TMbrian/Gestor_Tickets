import { TestBed } from '@angular/core/testing';
import { ServicioTickets } from './tickets.servicio';
import { ServicioAutenticacion } from './autenticacion.service';
import { MockTicketRepository } from '../mocks/mock-ticket.repository';
import { Ticket } from '../models/ticket.modelo';

describe('ServicioTickets QA Integridad y Reglas de Negocio', () => {
  let servicio: ServicioTickets;
  let mockRepo: MockTicketRepository;
  let mockAuth: any;

  beforeEach(() => {
    mockRepo = new MockTicketRepository();
    // Proveer un mock falso de auth para tener 'idUsuarioActual'
    mockAuth = { usuarioActual: { id: 'usr-123' } };

    TestBed.configureTestingModule({
      providers: [
        { provide: ServicioAutenticacion, useValue: mockAuth },
        // Aquí inyectaríamos el mockRepo en vez de Firestore
        // Pero como tickets.servicio.ts aún importa Firestore directamente,
        // instanciaremos el servicio manualmente mockeando sus dependencias en una Fase posterior.
        // Simularemos las pruebas de tiempos de solución utilizando las funciones puras.
        ServicioTickets,
        { provide: 'Firestore', useValue: {} } 
      ]
    });
    
    servicio = new ServicioTickets({} as any, mockAuth as any);
  });

  describe('Cierre y Tiempos de Resolución (tiempoSolucionMins)', () => {
    it('No debe arrojar tiempos negativos; ticket cerrado antes de asignación retorna null (Estado Roto)', () => {
      const ticketRoto: Ticket = {
        numeroTicket: 'T-01',
        idUsuario: 'usr-123',
        semana: 1,
        fechaAsignacion: '2026-06-05',
        horaAsignacion: '14:00',
        fechaCierre: '2026-06-04', // Cierre erróneo en el pasado
        horaCierre: '10:00',
        estado: 'Cerrado',
        tiempoSolucionMins: null,
        estaAsignado: true,
        esRfc: false,
        numeroRfc: null,
        sitio: 'A',
        areaAfectada: 'B',
        descripcion: 'Test',
        creadoEn: Date.now(),
        actualizadoEn: Date.now()
      };
      
      const tiempocalculado = servicio.calcularTiempoSolucion(ticketRoto);
      expect(tiempocalculado).toBeNull(); // ADR-0001: fin < inicio es estado roto, no 0
    });

    it('Debe descontar los minutos de pausa (tiempoPausaMins) del tiempo total sumado', () => {
      const ticketPausado: Ticket = {
        numeroTicket: 'T-02',
        idUsuario: 'usr-123',
        semana: 1,
        fechaAsignacion: '2026-05-01',
        horaAsignacion: '10:00',
        fechaCierre: '2026-05-01',
        horaCierre: '12:00', // Total = 120 minutos
        tiempoPausaMins: 30, // 30 minutos pausado
        estado: 'Cerrado',
        tiempoSolucionMins: null,
        estaAsignado: true,
        esRfc: false,
        numeroRfc: null,
        sitio: 'A',
        areaAfectada: 'B',
        descripcion: 'Test',
        creadoEn: Date.now(),
        actualizadoEn: Date.now()
      };

      const tiempoReal = servicio.calcularTiempoSolucion(ticketPausado);
      expect(tiempoReal).toBe(90); // 120 totales - 30 en pausa
    });
  });

  describe('Retrocompatibilidad JSON Legacy', () => {
    // Estas rutinas se ejecutan usualmente al leer tickets viejos del repository,
    // garantizamos que "tiempoPausaMins" es tolerado como nulo/undefined
    it('Resuelve tolerancia de tickets sin propiedad tiempoPausaMins', () => {
      const ticketViejo: any = {
        fechaAsignacion: '2026-05-01',
        horaAsignacion: '10:00',
        fechaCierre: '2026-05-01',
        horaCierre: '11:00',
        tiempoSolucionMins: null,
        // Sin tiempoPausaMins
      };

      const calculo = servicio.calcularTiempoSolucion(ticketViejo as Ticket);
      expect(calculo).toBe(60); // Asume pausa = 0
    });
  });
});
