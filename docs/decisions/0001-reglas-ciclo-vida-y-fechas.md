# ADR 0001: Reglas de Negocio del Ciclo de Vida del Ticket y Fechas Operacionales

**Fecha:** 2026-05-23
**Estado:** Aprobado

## Contexto
Durante el proceso de estabilización y migración desde Firebase hacia una arquitectura REST + SQL (Fase 0 y Fase 1), identificamos la necesidad de centralizar y documentar formalmente las reglas matemáticas y de negocio que dictan los cálculos ISO y los tiempos de resolución. La lógica dispersa o asumida genera riesgo de regresiones incontrolables en el entorno analítico.

## Decisiones y Definiciones Oficiales

### 1. Desplazamiento de Sábados y Domingos (Semana/Año ISO)
* **Regla:** Cualquier ticket creado, modificado o cerrado en un día Sábado o Domingo **debe** transponerse artificialmente al día Lunes de la semana inmediatamente posterior.
* **Justificación:** Los fines de semana no se consideran días hábiles operacionales contabilizables para las métricas de la semana vigente. 
* **Ejecución Técnica:** Al calcular `semanaISO` o `anioISO`, se añade estáticamente +2 días (si es Sábado) o +1 día (si es Domingo) antes de determinar la matriz ISO 8601 UTC. 

### 2. Timezone Oficial de Operación
* El ciclo de vista al usuario operará en el timezone **local** del equipo cliente.
* Sin embargo, para aislar el cálculo matemático (ISO Week, anioISO) de errores geográficos, el núcleo (`DateUtils`) aplicará los desplazamientos siempre mapeando internamente a fechas estancas en **UTC** a las 00:00:00 (Ej. `Date.UTC()`).

### 3. Ciclo de Vida del Ticket (Tiempos de Solución)
* **Inicio del Tiempo (`inicioSolucion`):** El contador interno inicia formalmente por orden de precedencia:
   1. `fechaInicioSolucion` + `horaInicioSolucion` si el ticket pasó a estado preventivo ("En Progreso").
   2. _Fallback:_ `fechaAsignacion` + `horaAsignacion` si directamente nunca existió estado En Progreso.
* **Pausas (`tiempoPausaMins`):**
  - Un ticket entra en estado `Pausado`. El reloj se congela calculando la marca de tiempo `ultimaPausaInicio`.
  - Al cambiar de estado a `En Progreso` o `Cerrado`, se resta `Now() - ultimaPausaInicio` sumándolo al buffer de pausas (`tiempoPausaMins`).
* **Reapertura de Tickets (De "Cerrado" a "Abierto"):**
  - Actualmente, el sistema NO está diseñado para reabrir y reiniciar relojes. Reabrir un ticket calculará falsos negativos si no resetea `tiempoSolucionMins` y `tiempoPausaMins`. La regla dicta que **TODO tiempo previo se descarta o acumula como buffer congelado**.
* **Fechas Inválidas / Casos Rotos:**
  - Si la entrada inyecta strings vacíos o cadenas no parseables (`NaN`), el resultado de métricas de ese registro será `null`. El sistema jamás devolverá tiempos negativos; si fecha fin es anterior a inicio, retorna `null`.
