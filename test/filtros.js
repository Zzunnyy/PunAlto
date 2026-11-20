// Prueba automática de los filtros. Uso: node test/filtros.js
const assert = require('assert');
const PA = require('../core.js');

const fila = (n, creado, cola, agente, cierre = '', estado = 'closed successful') => ({
  'Ticket#': String(n), Creado: creado + ' (America/Santiago)', 'Fecha de cierre': cierre ? cierre + ' (America/Santiago)' : '', Cola: cola, Estado: estado,
  'Agente/Propietario': agente, 'Tiempo contabilizado': '0',
});
// 2026-05-03 es domingo, 2026-05-04 lunes, 2026-05-05 martes.
const rows = [
  fila(1, '2026-05-04 09:00:00', 'BecoSoporte::Soporte de Aplicaciones', 'Gabriela Quispe Leon', '2026-05-04 10:00:00'),
  fila(2, '2026-05-05 09:00:00', 'BecoSoporte::Soporte de Escritorio', 'Camila Ruiz Vega', '2026-05-06 10:00:00'),
  fila(3, '2026-05-03 11:00:00', 'Producción', 'Washington Morales Palacios', '2026-05-03 12:00:00'),       // domingo, cola y agente excluidos
  fila(4, '2026-05-03 12:00:00', 'Incidentes', 'Marco Manríquez Meza', '2026-05-03 13:00:00'),               // domingo, cola y agente excluidos
  fila(5, '2026-05-05 15:00:00', 'BecoSoporte::Soporte de Aplicaciones', 'Marco Manríquez Meza', '2026-05-05 16:00:00'), // solo agente
  fila(6, '2026-05-05 16:00:00', 'Producción', 'Gabriela Quispe Leon', '2026-05-05 17:00:00'),               // solo cola
  fila(7, '2026-06-02 09:00:00', 'BecoSoporte::Soporte de Aplicaciones', 'Gabriela Quispe Leon', '', 'open'),
];

// Sin filtros: cuenta todo.
const sin = PA.analizar(rows);
assert.strictEqual(sin.creados['2026-05'], 6);
assert.strictEqual(sin.semana['2026-05'][6], 2, 'sin filtros hay 2 tickets del domingo');

// Con los criterios por defecto de Soporte.
const cfg = PA.mezclarConfig(sin, null);
const excl = cfg.colas.filter((c) => !c.incluir).map((c) => c.raw).sort();
assert.deepStrictEqual(excl, ['Incidentes', 'Producción'], 'colas excluidas por defecto');
assert.deepStrictEqual(cfg.agentes.filter((a) => !a.incluir).map((a) => a.nombre).sort(), ['Marco Manríquez Meza', 'Washington Morales Palacios'], 'agentes (con o sin tilde) excluidos por defecto');

const an = PA.analizar(rows, PA.filtrosDe(cfg));
const rep = PA.calcular(an, '2026-05', cfg);
assert.strictEqual(rep.creados, 2, 'solo quedan los tickets 1 y 2');
assert.strictEqual(rep.cierres, 2, 'los cierres de tickets excluidos no cuentan');
assert.strictEqual(rep.sem[6], 0, 'no queda ningún ticket de domingo');
assert.strictEqual(rep.finde, 0);
assert.strictEqual(rep.totalColas, 2, 'las láminas por colas suman el total del mes');
assert.strictEqual(rep.diario[2], 0, 'el día 3 queda sin tickets');
assert.deepStrictEqual(rep.colas.map((c) => c.nombre).sort(), ['Soporte de Aplicaciones', 'Soporte de Escritorio']);
assert.strictEqual(an.excluidosTotal, 4);
assert.deepStrictEqual(an.exclMes['2026-05'], { n: 4, porCola: 3, porAgente: 3, porDia: 0 });
assert.ok(rep.avisos.some((a) => /excluyeron 4 de 6 tickets de mayo/.test(a.texto)), 'avisa cuántos se excluyeron');
// La evolución mensual y el mes siguen existiendo aunque se filtre.
assert.deepStrictEqual(an.meses, ['2026-05', '2026-06']);

// Desmarcar un agente por separado.
const cfg2 = PA.mezclarConfig(sin, null);
cfg2.colas.forEach((c) => { c.incluir = true; });                // solo filtra agentes
const rep2 = PA.calcular(PA.analizar(rows, PA.filtrosDe(cfg2)), '2026-05', cfg2);
assert.strictEqual(rep2.creados, 3, 'tickets 1, 2 y 6 (el 6 es de Producción pero de otra persona)');

// Días de la semana: elegir qué días entran al informe (los demás se descartan por completo).
const cfgD = PA.mezclarConfig(sin, null);
cfgD.colas.forEach((c) => { c.incluir = true; }); cfgD.agentes.forEach((a) => { a.incluir = true; });  // solo filtra por día
assert.deepStrictEqual(cfgD.dias, [true, true, true, true, true, true, true], 'por defecto todos los días están incluidos');
cfgD.dias[6] = false;                                                                                   // sin domingo
const anD = PA.analizar(rows, PA.filtrosDe(cfgD));
const repD = PA.calcular(anD, '2026-05', cfgD);
assert.deepStrictEqual(PA.filtrosDe(cfgD).dias, [6]);
assert.strictEqual(repD.creados, 4, 'los 2 tickets de domingo salen');
assert.strictEqual(repD.sem[6], 0);
assert.deepStrictEqual(repD.diasIncl, [0, 1, 2, 3, 4, 5], 'el gráfico solo muestra los días elegidos');
assert.strictEqual(repD.findeIncl, true, 'el sábado sigue incluido');
assert.deepStrictEqual(anD.exclMes['2026-05'], { n: 2, porCola: 0, porAgente: 0, porDia: 2 });
assert.ok(!repD.ordenSem.includes(6));
cfgD.dias[5] = false;                                                                                   // sin fin de semana
const repD2 = PA.calcular(PA.analizar(rows, PA.filtrosDe(cfgD)), '2026-05', cfgD);
assert.strictEqual(repD2.findeIncl, false);
assert.strictEqual(repD2.finde, 0);
// Solo lunes: el resto de los días desaparece de todos los indicadores.
const cfgL = PA.mezclarConfig(sin, null); cfgL.colas.forEach((c) => { c.incluir = true; }); cfgL.agentes.forEach((a) => { a.incluir = true; });
cfgL.dias = [true, false, false, false, false, false, false];
const repL = PA.calcular(PA.analizar(rows, PA.filtrosDe(cfgL)), '2026-05', cfgL);
assert.strictEqual(repL.creados, 1);
assert.deepStrictEqual(repL.diasIncl, [0]);
// Guardado: los días elegidos se restauran.
const cfgG = PA.mezclarConfig(sin, JSON.parse(JSON.stringify({ colas: cfg.colas, agentes: cfg.agentes, dias: [true, true, true, true, true, true, false] })));
assert.strictEqual(cfgG.dias[6], false);

// Guardado y restauración: lo que el usuario decidió prevalece sobre los valores por defecto.
const guardada = JSON.parse(JSON.stringify({ colas: cfg.colas, agentes: cfg.agentes, proximos: 'x', graficos: 'nativo' }));
guardada.colas.find((c) => c.raw === 'Producción').incluir = true;
const cfg3 = PA.mezclarConfig(sin, guardada);
assert.strictEqual(cfg3.colas.find((c) => c.raw === 'Producción').incluir, true);
assert.strictEqual(cfg3.graficos, 'nativo');
console.log('filtros: todas las pruebas pasaron');
