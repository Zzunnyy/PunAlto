/* Lectura de la sábana de tickets y cálculo de indicadores. Sin dependencias de DOM. */
(function (root) {
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const NUM_FEM = { 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce' };

  const norm = (s) => String(s == null ? '' : s).trim();
  const sinTildes = (s) => norm(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const palabra = (n) => NUM_FEM[n] || String(n);
  const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function parseFecha(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(norm(s));
    if (!m) return null;
    return { ym: m[1] + '-' + m[2], y: +m[1], mo: +m[2], d: +m[3] };
  }
  const diasDelMes = (ym) => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  const nombreMes = (ym) => MESES[+ym.slice(5, 7) - 1];
  const etiquetaMes = (ym) => nombreMes(ym) + ' ' + ym.slice(0, 4);
  // Lunes = 0 ... Domingo = 6
  const diaSemana = (f) => (new Date(f.y, f.mo - 1, f.d).getDay() + 6) % 7;

  // Nombre con que aparece la cola en las láminas (editable en pantalla).
  function nombreCola(raw) {
    const r = norm(raw);
    if (/^Escalamiento Nivel 2::Gesti[oó]n Riesgo\/Seguridad/i.test(r)) return 'Riesgo y Seguridad';
    const resto = r.includes('::') ? r.split('::').slice(1).join('::') : r;
    return resto.replace(/\s+-\s+\w+$/, '').trim().replace(/^Gestion de cuentas BANCO$/, 'Gestión de cuentas BANCO');
  }

  // Columna del creador/responsable del ticket (en la sábana de OTRS es «Agente/Propietario»).
  const COLUMNAS_AGENTE = ['agente/propietario', 'propietario', 'agente', 'creado por', 'creador'];
  const claveAgente = (s) => sinTildes(s).replace(/\s+/g, ' ');

  // Criterios del equipo de Soporte (se pueden cambiar en pantalla): tickets de otras áreas que no entran al informe.
  const COLAS_EXCLUIDAS_DEFECTO = ['incidentes', 'produccion'];
  const AGENTES_EXCLUIDOS_DEFECTO = ['marco manriquez', 'washington morales'];
  const excluirColaPorDefecto = (raw) => COLAS_EXCLUIDAS_DEFECTO.includes(sinTildes(raw));
  const excluirAgentePorDefecto = (clave) => AGENTES_EXCLUIDOS_DEFECTO.some((p) => clave === p || clave.startsWith(p + ' '));

  // filtros: { colas: [nombre de cola en la sábana], agentes: [clave de agente] } que se EXCLUYEN de todo el informe.
  function analizar(rows, filtros) {
    if (!rows || !rows.length) throw new Error('El archivo no tiene filas de datos.');
    const idx = {};
    Object.keys(rows[0]).forEach((k) => { idx[sinTildes(k)] = k; });
    const kCre = idx['creado'], kCie = idx['fecha de cierre'], kCola = idx['cola'];
    const kEstado = idx['estado'], kTiempo = idx['tiempo contabilizado'], kTicket = idx['ticket#'];
    const kAg = COLUMNAS_AGENTE.map((n) => idx[n]).find(Boolean);
    const faltan = [];
    if (!kCre) faltan.push('Creado');
    if (!kCie) faltan.push('Fecha de cierre');
    if (!kCola) faltan.push('Cola');
    if (faltan.length) {
      throw new Error('No encuentro la(s) columna(s): ' + faltan.join(', ') + '. Revisa que sea la sábana de tickets y que la fila 1 tenga los encabezados.');
    }
    const exCola = new Set((filtros && filtros.colas) || []);
    const exAg = new Set((filtros && filtros.agentes) || []);
    const exDia = new Set((filtros && filtros.dias) || []); // 0 = lunes ... 6 = domingo
    const diasTotal = [0, 0, 0, 0, 0, 0, 0];

    const creados = {}, cerrados = {}, colaMes = {}, semana = {}, diario = {}, cerradosAlCorte = {};
    const colasTotal = {}, agTotal = {}, mesesAll = {}, exclMes = {};
    let sinFecha = 0, max = null, tiempoCero = true, dup = 0, registrosTiempo = 0, excluidosTotal = 0;
    const vistos = new Set();
    for (const r of rows) {
      if (kTicket) {
        const t = norm(r[kTicket]);
        if (t) { if (vistos.has(t)) dup++; else vistos.add(t); }
      }
      const f = parseFecha(r[kCre]);
      if (!f) { sinFecha++; continue; }
      const cola = norm(r[kCola]) || '(sin cola)';
      const nombreAg = kAg ? norm(r[kAg]) : '';
      const clave = claveAgente(nombreAg);
      // Inventario y límites de la sábana: siempre sobre todos los registros, con o sin filtros.
      colasTotal[cola] = (colasTotal[cola] || 0) + 1;
      if (clave) { (agTotal[clave] = agTotal[clave] || { clave, nombre: nombreAg, n: 0 }).n++; }
      mesesAll[f.ym] = true;
      const dow = diaSemana(f);
      diasTotal[dow]++;
      if (!max || f.ym > max.ym || (f.ym === max.ym && f.d > max.d)) max = f;

      // Filtros: el ticket excluido no existe para ningún indicador.
      const porCola = exCola.has(cola), porAgente = !!clave && exAg.has(clave), porDia = exDia.has(dow);
      if (porCola || porAgente || porDia) {
        const e = exclMes[f.ym] = exclMes[f.ym] || { n: 0, porCola: 0, porAgente: 0, porDia: 0 };
        e.n++; if (porCola) e.porCola++; if (porAgente) e.porAgente++; if (porDia) e.porDia++;
        excluidosTotal++;
        continue;
      }
      if (kTiempo) { registrosTiempo++; const v = norm(r[kTiempo]); if (v !== '' && v !== '0') tiempoCero = false; }
      creados[f.ym] = (creados[f.ym] || 0) + 1;
      (colaMes[f.ym] = colaMes[f.ym] || {})[cola] = (colaMes[f.ym][cola] || 0) + 1;
      (semana[f.ym] = semana[f.ym] || [0, 0, 0, 0, 0, 0, 0])[dow]++;
      (diario[f.ym] = diario[f.ym] || {})[f.d] = (diario[f.ym][f.d] || 0) + 1;
      if (kEstado && /^closed/i.test(norm(r[kEstado]))) cerradosAlCorte[f.ym] = (cerradosAlCorte[f.ym] || 0) + 1;
      const c = parseFecha(r[kCie]);
      if (c) cerrados[c.ym] = (cerrados[c.ym] || 0) + 1;
    }
    const meses = Object.keys(mesesAll).sort();
    if (!meses.length) throw new Error('No pude leer fechas en la columna Creado (esperaba el formato AAAA-MM-DD hh:mm:ss).');
    return {
      n: rows.length, sinFecha, dup, tiempoCero: !!kTiempo && tiempoCero, registrosTiempo, tieneEstado: !!kEstado, tieneAgente: !!kAg,
      meses, creados, cerrados, cerradosAlCorte, colaMes, semana, diario, exclMes, excluidosTotal, diasTotal,
      colasRaw: Object.keys(colasTotal).sort((a, b) => colasTotal[b] - colasTotal[a]), colasTotal,
      agentes: Object.values(agTotal).sort((a, b) => b.n - a.n), max,
    };
  }
  // Traduce la configuración de pantalla a los filtros que entiende analizar().
  function filtrosDe(cfg) {
    return {
      colas: cfg.colas.filter((c) => !c.incluir).map((c) => c.raw),
      agentes: (cfg.agentes || []).filter((a) => !a.incluir).map((a) => a.clave),
      dias: (cfg.dias || []).map((inc, i) => (inc === false ? i : -1)).filter((i) => i >= 0),
    };
  }

  function mesCompleto(an, ym) {
    if (ym < an.max.ym) return true;
    return an.max.d >= diasDelMes(ym);
  }
  function mesPorDefecto(an) {
    const compl = an.meses.filter((m) => mesCompleto(an, m));
    return (compl.length ? compl : an.meses).slice(-1)[0];
  }

  function configPorDefecto(an) {
    return {
      colas: an.colasRaw.map((raw) => ({ raw, nombre: nombreCola(raw), incluir: !excluirColaPorDefecto(raw) })),
      agentes: an.agentes.map((a) => ({ clave: a.clave, nombre: a.nombre, incluir: !excluirAgentePorDefecto(a.clave) })),
      dias: [true, true, true, true, true, true, true],
      proximos: '',
      graficos: 'imagen',
    };
  }
  // Mezcla la configuración guardada con las colas y agentes detectados en el archivo actual.
  function mezclarConfig(an, guardada) {
    const base = configPorDefecto(an);
    if (!guardada) return base;
    const porRaw = {}, porClave = {};
    (guardada.colas || []).forEach((c) => { porRaw[c.raw] = c; });
    (guardada.agentes || []).forEach((a) => { porClave[a.clave] = a; });
    base.colas = base.colas.map((c) => (porRaw[c.raw] ? { ...c, nombre: porRaw[c.raw].nombre, incluir: porRaw[c.raw].incluir } : c));
    base.agentes = base.agentes.map((a) => (porClave[a.clave] ? { ...a, incluir: porClave[a.clave].incluir } : a));
    if (Array.isArray(guardada.dias) && guardada.dias.length === 7) base.dias = guardada.dias.map((x) => x !== false);
    if (typeof guardada.proximos === 'string') base.proximos = guardada.proximos;
    if (guardada.graficos === 'nativo' || guardada.graficos === 'imagen') base.graficos = guardada.graficos;
    return base;
  }

  const pct1 = (v) => v.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function calcular(an, ym, cfg) {
    const avisos = [];
    const mes = nombreMes(ym), mesL = mes.toLowerCase();
    const primerMes = ym === an.meses[0];
    const corte = { d: an.max.d, mes: nombreMes(an.max.ym).toLowerCase() };

    const creados = an.creados[ym] || 0;
    const cierres = an.cerrados[ym] || 0;
    const alCorte = an.cerradosAlCorte[ym] || 0;

    // Colas (solo las incluidas; las que comparten nombre se suman), de mayor a menor.
    const incl = cfg.colas.filter((c) => c.incluir && norm(c.nombre));
    const nombres = [...new Set(incl.map((c) => norm(c.nombre)))];
    const contar = (nombre) => incl.filter((c) => norm(c.nombre) === nombre).reduce((s, c) => s + ((an.colaMes[ym] || {})[c.raw] || 0), 0);
    const colas = nombres.map((n) => ({ nombre: n, n: contar(n) })).filter((c) => c.n > 0).sort((a, b) => b.n - a.n);
    const totalColas = colas.reduce((s, c) => s + c.n, 0);
    const top = colas[0] || { nombre: '–', n: 0 };
    const topPct = totalColas ? (top.n / totalColas) * 100 : 0;
    const N5 = Math.min(5, colas.length);
    const top5 = colas.slice(0, N5);
    const resto5 = colas.slice(N5);
    const top5Suma = top5.reduce((s, c) => s + c.n, 0);
    const top5Pct = totalColas ? (top5Suma / totalColas) * 100 : 0;

    // Día de la semana (lunes a domingo).
    const diasOk = Array.from({ length: 7 }, (_, i) => !(cfg.dias && cfg.dias[i] === false));
    const diasIncl = [0, 1, 2, 3, 4, 5, 6].filter((i) => diasOk[i]);
    const sem = (an.semana[ym] || [0, 0, 0, 0, 0, 0, 0]).slice(); // los días excluidos ya vienen en cero
    const findeIncl = diasOk[5] || diasOk[6];
    const finde = (diasOk[5] ? sem[5] : 0) + (diasOk[6] ? sem[6] : 0);
    const ordenSem = diasIncl.slice().sort((a, b) => sem[b] - sem[a] || a - b);

    // Ingreso diario del mes.
    const nd = diasDelMes(ym);
    const diario = Array.from({ length: nd }, (_, i) => (an.diario[ym] || {})[i + 1] || 0);
    const diasConDatos = mesCompleto(an, ym) ? nd : Math.min(nd, an.max.d);
    const maxDia = diario.reduce((b, v, i) => (v > diario[b] ? i : b), 0);

    // Evolución mensual (hasta 6 meses terminando en el elegido).
    const evo = an.meses.filter((m) => m <= ym).slice(-6).map((m) => ({
      ym: m, etiqueta: nombreMes(m), creados: an.creados[m] || 0, cerrados: an.cerrados[m] || 0, parcial: m === an.meses[0],
    }));
    const previo = evo.length > 1 ? evo[evo.length - 2] : null;
    const varPrevio = previo && previo.creados ? ((creados - previo.creados) / previo.creados) * 100 : null;

    // Avisos de calidad.
    if (!mesCompleto(an, ym)) {
      avisos.push({ nivel: 'warn', texto: `${etiquetaMes(ym)} está incompleto: la sábana llega hasta el ${an.max.d} de ${corte.mes}. Los totales del mes serán parciales.` });
    }
    if (primerMes) {
      avisos.push({ nivel: 'warn', texto: `La sábana comienza en ${mesL}: los cierres de ${mesL} pueden estar incompletos y no hay meses anteriores para comparar (no habrá lámina de evolución mensual).` });
    }
    if (colas.length < incl.length) {
      const sin = incl.length - colas.length;
      avisos.push({ nivel: 'info', texto: `${sin} cola(s) incluida(s) no tuvieron tickets en ${mesL} y no se muestran.` });
    }
    const ex = an.exclMes[ym];
    if (ex && ex.n) {
      const partes = [];
      if (ex.porCola) partes.push(`${ex.porCola} por colas excluidas`);
      if (ex.porAgente) partes.push(`${ex.porAgente} por agentes excluidos`);
      if (ex.porDia) partes.push(`${ex.porDia} por días de la semana excluidos`);
      avisos.push({ nivel: 'info', texto: `Filtros aplicados: se excluyeron ${ex.n} de ${ex.n + creados} tickets de ${mesL} (${partes.join(', ')}${partes.length > 1 ? '; algunos cumplen más de un criterio' : ''}). No aparecen en ninguna lámina.` });
    }
    if (creados === 0) avisos.push({ nivel: 'warn', texto: `Con los filtros actuales no queda ningún ticket creado en ${mesL}.` });
    if (an.tiempoCero) avisos.push({ nivel: 'info', texto: 'La columna «Tiempo contabilizado» viene en cero: no se pueden calcular minutos ni horas por ticket. La lámina de indicadores pendientes lo explica.' });
    if (!an.tieneEstado) avisos.push({ nivel: 'warn', texto: 'No encuentro la columna «Estado»: no se puede indicar cuántos tickets del mes figuran cerrados al corte.' });
    if (an.sinFecha) avisos.push({ nivel: 'warn', texto: `${an.sinFecha} fila(s) sin fecha de creación legible quedaron fuera.` });
    if (an.dup) avisos.push({ nivel: 'warn', texto: `Hay ${an.dup} Ticket# repetido(s) en el archivo; se cuentan como filas separadas.` });

    return {
      ym, mes, mesL, anio: ym.slice(0, 4), etiqueta: etiquetaMes(ym), primerMes, corte, primerMesEtiqueta: nombreMes(an.meses[0]).toLowerCase(),
      creados, cierres, alCorte, pctCierre: creados ? Math.round((cierres / creados) * 100) : null,
      colas, totalColas, top, topPct, topPctTxt: pct1(topPct), resto: totalColas - top.n, nOtrasTop: colas.length - 1,
      top5, resto5, top5Suma, top5Pct, top5PctTxt: pct1(top5Pct), N5,
      sem, finde, findeIncl, ordenSem, diasIncl, diario, diasConDatos, maxDia, evo, previo, varPrevio,
      tiempoCero: an.tiempoCero, registrosTiempo: an.registrosTiempo, tieneEstado: an.tieneEstado,
      avisos,
    };
  }

  const API = { filtrosDe, MESES, DIAS, DIAS_CORTO, palabra, mayus, pct1, nombreCola, analizar, mesCompleto, mesPorDefecto, configPorDefecto, mezclarConfig, calcular, etiquetaMes, nombreMes };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.PA = Object.assign(root.PA || {}, API);
})(typeof window !== 'undefined' ? window : globalThis);
