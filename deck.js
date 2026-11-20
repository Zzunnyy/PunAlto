/* Construye la presentación mensual (.pptx editable) con el diseño «Ejecutiva BN» (modelo de mayo 2026):
   fondo blanco, azul oscuro y gris; gráficos circular, de barras, de columnas y de línea. */
(function (root) {
  const C = {
    oscuro: '1D1E20', texto: '24282B', gris: '727A81', azulOsc: '1B4E70', azul: '37789F', celeste: '5DA8D1',
    azulClaro: 'D9E3E9', filaAlt: 'F4F5F6', ejes: '666666', linea: 'D4D4D4', blanco: 'FFFFFF',
  };
  const F = 'Aptos';
  const num = (v, d) => Number(v).toLocaleString('es-CL', { maximumFractionDigits: d == null ? 0 : d });

  function construir(PptxGenJS, rep, cfg, A, opt) {
    const P = root.PA && root.PA.palabra ? root.PA : (typeof require !== 'undefined' ? require('./core.js') : {});
    const palabra = P.palabra || String, DIAS = P.DIAS, DIAS_CORTO = P.DIAS_CORTO;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.title = `Servicio Mesa de Ayuda - Informe mensual ${rep.etiqueta}`;
    pptx.company = 'Punto Alto Soluciones Integrales';
    const piePagina = `PUNTO ALTO  /  ${rep.etiqueta.toUpperCase()}`;
    let n = 0;
    // Modo imagen: los gráficos se dibujan como PNG (se ven en cualquier visor). Modo nativo: gráficos editables de PowerPoint.
    const dibujar = opt && opt.graficos === 'imagen' && P.charts ? P.charts.dibujar : null;
    const addGrafico = (s, tipo, datos, o) => {
      if (dibujar) s.addImage({ data: dibujar(tipo, datos, o), x: o.x, y: o.y, w: o.w, h: o.h });
      else s.addChart(tipo, datos, o);
    };

    const txt = (s, t, x, y, w, h, o) => s.addText(t, Object.assign({
      x, y, w, h, fontFace: F, fontSize: 18, color: C.texto, valign: 'middle', align: 'left', margin: 0, fit: 'none',
    }, o || {}));
    const logo = (s, x, y, w) => s.addImage({ data: A.logo, x, y, w, h: w / 8.005 });

    // Lámina de contenido: barra superior, título, subtítulo, logo y pie.
    function contenido(titulo, sub) {
      const s = pptx.addSlide(); n++;
      s.background = { color: C.blanco };
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.15, fill: { color: C.celeste }, line: { type: 'none' } });
      txt(s, titulo, 0.71, 0.78, 9.38, 0.68, { fontSize: 29.25, bold: true, color: C.oscuro });
      logo(s, 10.12, 0.45, 2.45);
      if (sub) txt(s, sub, 0.72, 1.54, 11.56, 0.67, { fontSize: 19.5, color: C.gris, valign: 'top' });
      txt(s, piePagina, 0.71, 6.86, 5.21, 0.27, { fontSize: 10.5, bold: true, color: C.gris });
      txt(s, String(n).padStart(2, '0'), 12.08, 6.79, 0.73, 0.36, { fontSize: 12.75, bold: true, color: C.azul, align: 'right' });
      return s;
    }
    const ejeComun = { catAxisLabelFontFace: F, valAxisLabelFontFace: F, dataLabelFontFace: F, legendFontFace: F };

    // 1. Portada
    let s = pptx.addSlide(); n++;
    s.background = { color: C.oscuro };
    s.addImage({ data: A.portada, x: 7.36, y: 0.96, w: 5.97, h: 6.54 });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.96, fill: { color: C.blanco }, line: { type: 'none' } });
    logo(s, 0.73, 0.26, 3.54);
    s.addShape(pptx.ShapeType.rect, { x: 0.74, y: 2.15, w: 8.44, h: 3.33, fill: { type: 'none' }, line: { color: C.celeste, width: 3 } });
    txt(s, 'SERVICIO MESA DE AYUDA', 1.1, 2.5, 7.71, 0.57, { fontSize: 19.5, bold: true, color: C.blanco });
    txt(s, 'Informe mensual', 1.09, 3.12, 7.81, 0.86, { fontSize: 42.75, bold: true, color: C.blanco });
    txt(s, rep.etiqueta, 1.1, 4.05, 7.29, 0.88, { fontSize: 47.25, bold: true, color: C.blanco });
    txt(s, 'BECO   /   SOPORTE', 1.1, 5.03, 4.9, 0.4, { fontSize: 15, color: C.blanco });

    // 2. Resumen ejecutivo
    s = pptx.addSlide(); n++;
    s.background = { color: C.blanco };
    s.addImage({ data: A.resumen, x: 0, y: 0, w: 5.94, h: 7.5 });
    logo(s, 10.0, 0.5, 2.55);
    txt(s, 'Resumen ejecutivo', 6.51, 1.15, 6.15, 0.68, { fontSize: 29.25, bold: true, color: C.oscuro });
    txt(s, num(rep.creados), 6.51, 2.22, 6.0, 1.25, { fontSize: 77.25, bold: true, color: C.azulOsc });
    txt(s, `tickets creados en ${rep.mesL}`, 6.54, 3.43, 5.94, 0.45, { fontSize: 19.5 });
    txt(s, num(rep.cierres), 6.51, 4.36, 6.0, 0.89, { fontSize: 52.5, bold: true, color: C.azul });
    txt(s, `con cierre fechado en ${rep.mesL}¹`, 6.54, 5.32, 5.99, 0.49, { fontSize: 18 });
    txt(s, '¹ De los tickets incluidos en la sábana recibida.', 6.54, 6.39, 5.83, 0.4, { fontSize: 12, color: C.gris });

    // 3. Demanda concentrada (gráfico circular)
    const t = rep.top;
    const titulo3 = rep.topPct >= 50 ? 'La demanda se concentra en una cola' : (rep.topPct >= 30 ? 'Una cola lidera la demanda' : 'La demanda se reparte entre las colas');
    s = contenido(titulo3, `De los ${num(rep.totalColas)} tickets creados en ${rep.mesL}, ${num(t.n)} llegaron a ${t.nombre}.`);
    addGrafico(s, pptx.charts.DOUGHNUT, [{ name: 'Tickets', labels: [t.nombre, 'Resto de las colas'], values: [t.n, rep.resto] }], {
      x: 0.89, y: 2.44, w: 5.21, h: 3.88, holeSize: 72, chartColors: [C.azul, C.azulClaro], showLegend: false,
      showLabel: false, showValue: false, showPercent: false, showTitle: false, dataBorder: { pt: 1, color: C.blanco }, firstSliceAng: 0,
    });
    txt(s, `${rep.topPctTxt} %`, 1.88, 3.52, 3.12, 0.76, { fontSize: 44.25, bold: true, color: C.azulOsc, align: 'center' });
    txt(s, t.nombre, 1.91, 4.23, 3.07, 0.67, { fontSize: 16.5, bold: true, align: 'center', valign: 'top' });
    txt(s, num(t.n), 6.82, 2.73, 5.5, 1.02, { fontSize: 62.25, bold: true, color: C.azulOsc });
    txt(s, `tickets de ${t.nombre}`, 6.84, 3.78, 6.0, 0.47, { fontSize: 20.25, bold: true });
    txt(s, rep.nOtrasTop > 0
      ? `${num(rep.resto)} tickets se distribuyen ${rep.nOtrasTop === 1 ? 'en la otra cola' : 'entre las otras ' + palabra(rep.nOtrasTop) + ' colas'}.`
      : 'Todos los tickets del mes llegaron a esta cola.', 6.84, 4.75, 5.36, 0.97, { fontSize: 18, color: C.gris, valign: 'top' });

    // 4. Tickets por cola (barras horizontales)
    const hayOtras = rep.resto5.length > 0;
    const sub4 = hayOtras
      ? `${P.mayus ? P.mayus(palabra(rep.N5)) : rep.N5} colas reúnen ${num(rep.top5Suma)} tickets, el ${rep.top5PctTxt} % de ${rep.mesL}.`
      : `${rep.N5 === 1 ? 'Una cola reúne' : P.mayus(palabra(rep.N5)) + ' colas reúnen'} ${num(rep.top5Suma)} tickets, el 100 % de ${rep.mesL}.`;
    s = contenido('Tickets por cola', sub4);
    const barras = rep.top5.map((c) => ({ l: c.nombre, v: c.n }));
    if (hayOtras) barras.push({ l: `Otras ${palabra(rep.resto5.length)} colas`, v: rep.resto5.reduce((a, c) => a + c.n, 0) });
    const orden = barras.slice().reverse(); // la barra mayor queda arriba
    addGrafico(s, pptx.charts.BAR, [{ name: 'Tickets', labels: orden.map((b) => b.l), values: orden.map((b) => b.v) }],
      Object.assign({
        x: 1.16, y: 2.46, w: 10.83, h: 3.65, barDir: 'bar', barGapWidthPct: 70,
        chartColors: orden.map((_, i) => (i === orden.length - 1 ? C.azulOsc : C.azul)),
        showLegend: false, showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 13.5, dataLabelFontBold: true, dataLabelColor: C.texto,
        catAxisLabelFontSize: 13.5, catAxisLabelColor: C.ejes, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
        catAxisLineShow: true,
      }, ejeComun));

    // 5. Día de la semana (columnas): solo los días elegidos
    const di = rep.diasIncl, [d1, d2] = rep.ordenSem;
    const sub5 = rep.creados === 0 || !di.length ? ''
      : (di.length === 1 ? `${DIAS[d1]} es el único día considerado en este informe.` : `${DIAS[d1]} y ${DIAS[d2].toLowerCase()} concentran el mayor volumen de creación.`);
    s = contenido('Cuándo ingresaron los tickets', sub5);
    if (di.length) {
      addGrafico(s, pptx.charts.BAR, [{ name: 'Tickets', labels: di.map((i) => DIAS_CORTO[i]), values: di.map((i) => rep.sem[i]) }], Object.assign({
        x: 0.99, y: 2.62, w: 10.73, h: 3.18, barDir: 'col', barGapWidthPct: 78,
        chartColors: di.map((i) => (i >= 5 ? C.azulClaro : C.azul)),
        showLegend: false, showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 13.5, dataLabelFontBold: true, dataLabelColor: C.texto,
        catAxisLabelFontSize: 14.25, catAxisLabelColor: C.texto, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
      }, ejeComun));
    }
    if (rep.findeIncl) {
      const solo = rep.diasIncl.includes(5) && rep.diasIncl.includes(6) ? 'durante el fin de semana' : (rep.diasIncl.includes(5) ? 'el sábado' : 'el domingo');
      txt(s, `${num(rep.finde)} ${rep.finde === 1 ? 'ticket fue creado' : 'tickets fueron creados'} ${solo}.`, 0.72, 5.96, 10.52, 0.44, { fontSize: 17.25, bold: true, color: C.azulOsc });
    }

    // 6. Ingreso diario (línea)
    const dias = rep.diario.slice(0, rep.diasConDatos);
    const prom = rep.creados / Math.max(1, rep.diasConDatos);
    s = contenido('Ingreso diario de tickets',
      `El mayor ingreso fue el ${rep.maxDia + 1} de ${rep.mesL}, con ${num(rep.diario[rep.maxDia])} tickets.`);
    addGrafico(s, pptx.charts.LINE, [{ name: 'Tickets creados', labels: dias.map((_, i) => String(i + 1)), values: dias }], Object.assign({
      x: 0.99, y: 2.5, w: 10.73, h: 3.4, chartColors: [C.azul], lineSize: 3, lineDataSymbol: 'circle', lineDataSymbolSize: 7,
      showLegend: false, showValue: false, catAxisLabelFontSize: 12, catAxisLabelColor: C.ejes, valAxisLabelFontSize: 12, valAxisLabelColor: C.ejes,
      valGridLine: { color: C.azulClaro, size: 0.75 }, catGridLine: { style: 'none' }, valAxisMinVal: 0,
    }, ejeComun));
    txt(s, `Promedio: ${num(prom, 1)} tickets por día${rep.diasConDatos < rep.diario.length ? ` (hasta el ${rep.diasConDatos})` : ''}.`, 0.72, 5.96, 10.52, 0.44, { fontSize: 17.25, bold: true, color: C.azulOsc });

    // 7. Evolución mensual (línea) — solo si hay al menos dos meses
    if (rep.evo.length >= 2) {
      // Eje ajustado al rango de los datos para que se note la diferencia entre creados y cerrados.
      const vv = rep.evo.flatMap((e) => [e.creados, e.cerrados]);
      const mn = Math.min(...vv), mx = Math.max(...vv), rg = Math.max(mx - mn, mx * 0.08, 1);
      const paso = Math.pow(10, Math.floor(Math.log10(rg * 2 / 5)));
      const ejeEvo = { min: Math.max(0, Math.floor((mn - rg * 1.2) / paso) * paso), max: Math.ceil((mx + rg * 0.6) / paso) * paso };
      let sub7 = `Tickets creados y cerrados, de ${rep.evo[0].etiqueta.toLowerCase()} a ${rep.mesL}.`;
      s = contenido('Evolución mensual', sub7);
      addGrafico(s, pptx.charts.LINE, [
        { name: 'Tickets creados', labels: rep.evo.map((e) => e.etiqueta), values: rep.evo.map((e) => e.creados) },
        { name: 'Tickets cerrados', labels: rep.evo.map((e) => e.etiqueta), values: rep.evo.map((e) => e.cerrados) },
      ], Object.assign({
        x: 0.99, y: 2.4, w: 10.73, h: 3.5, valAxisMinVal: ejeEvo.min, valAxisMaxVal: ejeEvo.max, chartColors: [C.azulOsc, C.celeste], lineSize: 3.5, lineDataSymbol: 'circle', lineDataSymbolSize: 9,
        showLegend: true, legendPos: 't', legendFontSize: 13, legendColor: C.texto, showValue: true, dataLabelPosition: 't', dataLabelFontSize: 12.75,
        dataLabelFontBold: true, dataLabelColor: C.texto, catAxisLabelFontSize: 13.5, catAxisLabelColor: C.texto, valAxisHidden: true,
        valGridLine: { color: C.azulClaro, size: 0.75 }, catGridLine: { style: 'none' },
      }, ejeComun));
      let nota = '';
      if (rep.varPrevio != null && isFinite(rep.varPrevio)) {
        const v = Math.abs(rep.varPrevio);
        nota = v < 0.5 ? `${rep.mes} registró un volumen similar al de ${rep.previo.etiqueta.toLowerCase()}.`
          : `${rep.mes} registró ${P.pct1(v)} % ${rep.varPrevio > 0 ? 'más' : 'menos'} tickets creados que ${rep.previo.etiqueta.toLowerCase()}.`;
      }
      if (nota) txt(s, nota, 0.72, 5.96, 10.52, 0.44, { fontSize: 17.25, bold: true, color: C.azulOsc });
    }

    // 8. Cierres del mes
    s = pptx.addSlide(); n++;
    s.background = { color: C.blanco };
    s.addImage({ data: A.cierres, x: 0, y: 0, w: 5.31, h: 7.5 });
    logo(s, 10.02, 0.48, 2.55);
    txt(s, `Cierres de ${rep.mesL}`, 5.77, 1.2, 6.72, 0.67, { fontSize: 30, bold: true, color: C.oscuro });
    txt(s, num(rep.cierres), 5.83, 2.36, 6.0, 1.08, { fontSize: 63.75, bold: true, color: C.azulOsc });
    txt(s, rep.primerMes ? `tickets creados en ${rep.mesL} y cerrados en ${rep.mesL}` : `tickets con fecha de cierre en ${rep.mesL}`, 5.84, 3.44, 6.9, 0.67, { fontSize: 18 });
    if (rep.tieneEstado) {
      txt(s, num(rep.alCorte), 5.83, 4.47, 5.0, 0.85, { fontSize: 50.25, bold: true, color: C.gris });
      txt(s, `de los tickets de ${rep.mesL} figuran cerrados al ${rep.corte.d} de ${rep.corte.mes}`, 5.85, 5.36, 6.9, 0.69, { fontSize: 16.5 });
    }
    txt(s, rep.primerMes
      ? `El porcentaje de cierre mensual requiere un reporte completo de ${rep.mesL}.`
      : `Equivale al ${rep.pctCierre} % de los tickets creados en el mes.`, 5.82, 6.3, 6.9, 0.64, { fontSize: 15, bold: true, color: C.azul });

    // 9. Detalle de las colas (tabla)
    const nc = rep.colas.length;
    s = contenido(`Detalle de ${nc === 1 ? 'la cola' : 'las ' + palabra(nc) + ' colas'}`, null);
    const rowH = Math.min(0.426, 4.69 / (nc + 1)), fs = nc > 12 ? 10.5 : 12.75;
    const cel = (tx, o, fill) => ({ text: tx, options: Object.assign({ fontFace: F, fontSize: fs, color: C.texto, fill: { color: fill }, valign: 'middle', margin: [0, 0.1, 0, 0.1] }, o) });
    const filas = [[
      cel('Cola', { bold: true, color: C.blanco, fontSize: 13.5 }, C.azulOsc),
      cel('Tickets', { bold: true, color: C.blanco, fontSize: 13.5 }, C.azulOsc),
    ]].concat(rep.colas.map((c, i) => {
      const fill = i % 2 === 0 ? C.blanco : C.filaAlt;
      return [cel(c.nombre, { bold: false }, fill), cel(num(c.n), { bold: true }, fill)];
    }));
    s.addTable(filas, { x: 1.15, y: 1.72, w: 10.94, colW: [8.75, 2.19], rowH, border: { type: 'none' } });

    // 10. Indicadores que requieren otra fuente (solo si hay algo que decir)
    const bloques = [];
    if (rep.tiempoCero) bloques.push(['TIEMPO DE ATENCIÓN', `La columna «Tiempo contabilizado» tiene valor cero en los ${num(rep.registrosTiempo)} registros. No permite calcular minutos por ticket ni horas por cola.`]);
    if (rep.primerMes) bloques.push(['COMPARACIÓN MENSUAL', `La sábana comienza en ${rep.primerMesEtiqueta}. Para comparar con los meses anteriores se necesitan sus reportes originales.`]);
    if (bloques.length) {
      s = contenido('Indicadores que requieren otra fuente', null);
      bloques.forEach((b, i) => {
        txt(s, b[0], 0.79, i ? 4.49 : 1.97, 4.79, 0.46, { fontSize: 15, bold: true, color: C.azul });
        txt(s, b[1], 0.8, i ? 5.07 : 2.56, 11.56, i ? 1.06 : 1.26, { fontSize: 21.75, valign: 'top' });
      });
    }

    // 11. Próximos pasos
    s = pptx.addSlide(); n++;
    s.background = { color: C.oscuro };
    s.addImage({ data: A.pasos, x: 7.97, y: 0.96, w: 5.36, h: 6.54 });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.96, fill: { color: C.blanco }, line: { type: 'none' } });
    logo(s, 0.73, 0.26, 3.54);
    txt(s, 'Próximos pasos', 0.8, 1.66, 10.42, 0.77, { fontSize: 38.25, bold: true, color: C.blanco });
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 2.73, w: 11.35, h: 0.04, fill: { color: C.celeste }, line: { type: 'none' } });
    let pasos = String(cfg.proximos || '').split('\n').map((x) => x.trim()).filter(Boolean);
    if (!pasos.length) {
      if (rep.primerMes) pasos.push(`Validar los cierres de ${rep.mesL}`);
      if (rep.tiempoCero) pasos.push('Solicitar tiempos por ticket');
      if (rep.primerMes) pasos.push('Obtener los reportes de los meses anteriores');
      pasos.push('Confirmar actividades y responsables');
    }
    pasos.slice(0, 4).forEach((p, i) => {
      txt(s, `${String(i + 1).padStart(2, '0')}   ${p}`, 0.83, 3.28 + i * 0.92, 7.0, 0.62, { fontSize: 21.75, bold: true, color: C.blanco });
    });

    return pptx;
  }

  const nombreArchivo = (rep) => `Servicio mesa de ayuda Soporte ${rep.etiqueta}.pptx`;
  const API = { construir, nombreArchivo };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.PA = Object.assign(root.PA || {}, { deck: API });
})(typeof window !== 'undefined' ? window : globalThis);
