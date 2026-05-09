import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Ticket, Usuario } from '../models';

/**
 * Servicio de base de datos local basado en Dexie (IndexedDB).
 *
 * Centraliza la definición del esquema y el acceso a las tablas
 * de la aplicación para persistencia offline en el navegador.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioBaseDatos extends Dexie {

  /**
   * Tabla de tickets de soporte técnico.
   * La clave primaria es un entero autoincremental.
   */
  tickets!: Table<Ticket, number>;

  /**
   * Tabla de usuarios del sistema.
   * La clave primaria es el `id` de tipo string (UID de Firebase).
   */
  usuarios!: Table<Usuario, string>;

  constructor() {
    /** Nombre de la base de datos IndexedDB en el navegador */
    super('GestorTicketsDB');

    /**
     * Versión 3 del esquema de la base de datos.
     * Solo se declaran los campos indexados; Dexie almacena el objeto completo.
     * El prefijo `++` indica clave primaria autoincremental.
     * El prefijo `&` indica índice único.
     */
    this.version(3).stores({
      tickets: '++id, numeroTicket, semana, estado, sitio, areaAfectada, estaAsignado, esRfc, fechaAsignacion, idUsuario',
      usuarios: 'id, &nombreUsuario, contrasena, nombre, rol'
    });
  }
}