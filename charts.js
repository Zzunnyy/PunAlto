/* Dibuja los gráficos como imágenes PNG (alta resolución) para que se vean igual en PowerPoint, Google Slides,
   Keynote y la vista previa de Mac. Recibe la misma especificación que PptxGenJS (tipo, datos, opciones). Solo navegador. */
(function (root) {
  const DPI = 220, K = DPI / 72;
  const FONT = 'Aptos, "Segoe UI", Helvetica, Arial, sans-serif';
  const C = { texto: '#24282B', ejes: '#666666', linea: '#D4D4D4', rejilla: '#D9E3E9' };
  const hex = (c) => '#' + String(c).replace('#', '');
  const num = (v) => Number(v).toLocaleString('es-CL', { maximumFractionDigits: 2 });
  const fuente = (pt, bold) => `${bold ? '700' : '400'} ${Math.round(pt * K)}px ${FONT}`;

  function lienzo(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * DPI); c.height = Math.round(h * DPI);
    const g = c.getContext('2d');
    g.textBaseline = 'middle';
    return { c, g, W: c.width, H: c.height };
  }
  const salida = (c) => c.toDataURL('image/png').replace(/^data:/, '');

  function colorDe(opts, i, n) {
    const cs = opts.chartColors || ['37789F'];
    return hex(cs[i % cs.length]);
  }

  function dona(datos, opts) {
    const { c, g, W, H } = lienzo(opts.w, opts.h);
    const vals = datos[0].values, tot = vals.reduce((a, b) => a + b, 0) || 1;
    const R = Math.min(W, H) / 2 - 4, hole = (opts.holeSize || 72) / 100;
    const rm = (R + R * hole) / 2;
    g.lineWidth = R * (1 - hole);
    let a = -Math.PI / 2;
    vals.forEach((v, i) => {
      const da = (v / tot) * Math.PI * 2;
      g.beginPath(); g.arc(W / 2, H / 2, rm, a, a + da); g.strokeStyle = colorDe(opts, i); g.stroke();
      a += da;
    });
    return salida(c);
  }

  function barrasH(datos, opts) {
    const { c, g, W, H } = lienzo(opts.w, opts.h);
    const labels = datos[0].labels, vals = datos[0].values, n = labels.length;
    const fl = (opts.catAxisLabelFontSize || 13.5), fv = (opts.dataLabelFontSize || 13.5);
    g.font = fuente(fl, false);
    const x0 = Math.max(...labels.map((l) => g.measureText(l).width)) + 24 * K;
    const reserva = 70 * K, max = Math.max(1, ...vals);
    const fila = H / n, grosor = fila / (1 + (opts.barGapWidthPct || 70) / 100);
    labels.forEach((l, i) => {
      const cy = fila * i + fila / 2, w = ((W - x0 - reserva) * vals[i]) / max;
      g.fillStyle = colorDe(opts, i); g.fillRect(x0, cy - grosor / 2, Math.max(w, 1), grosor);
      g.fillStyle = hex(opts.catAxisLabelColor || C.ejes); g.font = fuente(fl, false); g.textAlign = 'right'; g.fillText(l, x0 - 12 * K, cy);
      if (opts.showValue) { g.fillStyle = C.texto; g.font = fuente(fv, true); g.textAlign = 'left'; g.fillText(num(vals[i]), x0 + w + 8 * K, cy); }
    });
    g.strokeStyle = C.linea; g.lineWidth = 1.2 * K; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, H); g.stroke();
    return salida(c);
  }

  function columnas(datos, opts) {
    const { c, g, W, H } = lienzo(opts.w, opts.h);
    const labels = datos[0].labels, vals = datos[0].values, n = labels.length;
    const fl = opts.catAxisLabelFontSize || 14, fv = opts.dataLabelFontSize || 13.5;
    const base = H - (fl * K) * 1.9, top = fv * K * 2.2, max = Math.max(1, ...vals);
    const slot = W / n, ancho = slot / (1 + (opts.barGapWidthPct || 78) / 100);
    labels.forEach((l, i) => {
      const h = ((base - top) * vals[i]) / max, x = slot * i + (slot - ancho) / 2;
      g.fillStyle = colorDe(opts, i); g.fillRect(x, base - h, ancho, Math.max(h, 1));
      g.textAlign = 'center';
      if (opts.showValue) { g.fillStyle = C.texto; g.font = fuente(fv, true); g.fillText(num(vals[i]), slot * i + slot / 2, base - h - fv * K * 0.9); }
      g.fillStyle = hex(opts.catAxisLabelColor || C.texto); g.font = fuente(fl, false); g.fillText(l, slot * i + slot / 2, base + fl * K * 1.1);
    });
    g.strokeStyle = C.linea; g.lineWidth = 1.2 * K; g.beginPath(); g.moveTo(0, base); g.lineTo(W, base); g.stroke();
    return salida(c);
  }

  function techo(max) {
    const e = Math.pow(10, Math.floor(Math.log10(max || 1))), f = max / e;
    const s = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return s * e;
  }

  function lineas(datos, opts) {
    const { c, g, W, H } = lienzo(opts.w, opts.h);
    const labels = datos[0].labels, n = labels.length;
    const fx = opts.catAxisLabelFontSize || 12, fy = opts.valAxisLabelFontSize || 12, fv = opts.dataLabelFontSize || 12.75;
    const leyenda = !!opts.showLegend && datos.length > 1;
    const todos = datos.flatMap((s) => s.values);
    const yMin = opts.valAxisMinVal != null ? opts.valAxisMinVal : 0;
    const yMax = opts.valAxisMaxVal != null ? opts.valAxisMaxVal : techo(Math.max(1, ...todos) * (opts.showValue ? 1.12 : 1.05));
    const pasos = 5, valorPaso = (i) => yMin + ((yMax - yMin) * i) / pasos;
    const ejeY = opts.valAxisHidden ? 8 * K : Math.max(...Array.from({ length: pasos + 1 }, (_, i) => { g.font = fuente(fy, false); return g.measureText(num(valorPaso(i))).width; })) + 14 * K;
    const arriba = (leyenda ? (opts.legendFontSize || 13) * K * 2.4 : 10 * K), abajo = fx * K * 2.2;
    const x0 = ejeY + 10 * K, x1 = W - 16 * K, y0 = H - abajo, y1 = arriba;
    const X = (i) => (n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * (i + 0.5)) / n);
    const Y = (v) => y0 - ((y0 - y1) * (v - yMin)) / (yMax - yMin);
    for (let i = 0; i <= pasos; i++) {
      const y = y0 - ((y0 - y1) * i) / pasos;
      g.strokeStyle = i === 0 ? C.linea : C.rejilla; g.lineWidth = (i === 0 ? 1.2 : 0.9) * K; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      if (!opts.valAxisHidden) { g.fillStyle = hex(opts.valAxisLabelColor || C.ejes); g.font = fuente(fy, false); g.textAlign = 'right'; g.fillText(num(valorPaso(i)), x0 - 8 * K, y); }
    }
    g.fillStyle = hex(opts.catAxisLabelColor || C.ejes); g.font = fuente(fx, false); g.textAlign = 'center';
    labels.forEach((l, i) => g.fillText(l, X(i), y0 + fx * K * 1.3));
    const r = (opts.lineDataSymbolSize || 7) * K / 2, lw = (opts.lineSize || 3) * K;
    datos.forEach((s, si) => {
      const col = colorDe(opts, si);
      g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.beginPath();
      s.values.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
    });
    datos.forEach((s, si) => {
      const col = colorDe(opts, si);
      s.values.forEach((v, i) => {
        g.fillStyle = col; g.beginPath(); g.arc(X(i), Y(v), r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 1.5 * K; g.stroke();
        if (opts.showValue) {
          // La etiqueta del valor mayor va arriba del punto y la del menor, abajo, para que no se encimen.
          const esMayor = datos.every((o, oi) => oi === si || v >= o.values[i]) && !(datos.length > 1 && datos.every((o) => o.values[i] === v) && si > 0);
          g.fillStyle = C.texto; g.font = fuente(fv, true); g.textAlign = 'center';
          g.fillText(num(v), X(i), esMayor ? Y(v) - r - fv * K * 0.8 : Y(v) + r + fv * K * 0.8);
        }
      });
    });
    if (leyenda) {
      g.font = fuente(opts.legendFontSize || 13, false);
      const total = datos.reduce((a, s) => a + g.measureText(s.name).width + 40 * K, 0);
      let x = (W - total) / 2 + 10 * K;
      datos.forEach((s, si) => { g.fillStyle = colorDe(opts, si); g.fillRect(x, 8 * K, 22 * K, 6 * K); g.fillStyle = C.texto; g.textAlign = 'left'; g.fillText(s.name, x + 30 * K, 11 * K); x += g.measureText(s.name).width + 52 * K; });
    }
    return salida(c);
  }

  // tipo: 'doughnut' | 'bar' | 'line' (los mismos valores de pptx.charts)
  function dibujar(tipo, datos, opts) {
    if (tipo === 'doughnut') return dona(datos, opts);
    if (tipo === 'line') return lineas(datos, opts);
    return opts.barDir === 'bar' ? barrasH(datos, opts) : columnas(datos, opts);
  }
  root.PA = Object.assign(root.PA || {}, { charts: { dibujar } });
})(window);
