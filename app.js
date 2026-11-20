(function () {
  const PA = window.PA;
  const KEY = 'pa-mesa-ayuda-v3';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, d) => (v == null ? '' : Number(v).toLocaleString('es-CL', { maximumFractionDigits: d == null ? 0 : d }));

  let rows = null, an = null, cfg = null, ym = null;

  function leerGuardado() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify({ colas: cfg.colas, agentes: cfg.agentes, dias: cfg.dias, proximos: cfg.proximos, graficos: cfg.graficos })); } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }
  function mostrarError(msg) { const e = $('error'); e.textContent = msg || ''; e.hidden = !msg; }

  async function cargarArchivo(file) {
    mostrarError('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const leidas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
      const inventario = PA.analizar(leidas); // sin filtros: detecta colas, agentes y meses
      cfg = PA.mezclarConfig(inventario, leerGuardado());
      an = PA.analizar(leidas, PA.filtrosDe(cfg));
      rows = leidas;
    } catch (e) {
      rows = an = null; $('resultado').hidden = true;
      mostrarError('No pude leer «' + file.name + '». ' + (e && e.message ? e.message : e));
      return;
    }
    ym = PA.mesPorDefecto(an);
    $('resumen-archivo').textContent = `${file.name} · ${fmt(an.n)} tickets en el archivo · de ${PA.etiquetaMes(an.meses[0])} a ${PA.etiquetaMes(an.meses[an.meses.length - 1])}`;
    $('mes').innerHTML = an.meses.map((m) => `<option value="${m}">${PA.etiquetaMes(m)}${PA.mesCompleto(an, m) ? '' : ' (incompleto)'}</option>`).join('');
    $('mes').value = ym;
    $('proximos').value = cfg.proximos || '';
    document.querySelectorAll('input[name=graficos]').forEach((r) => { r.checked = r.value === cfg.graficos; });
    renderConfig();
    renderVista();
    $('resultado').hidden = false;
  }

  function renderVista() {
    const rep = PA.calcular(an, ym, cfg);
    $('avisos').innerHTML = rep.avisos.map((x) => `<li class="${x.nivel}">${esc(x.texto)}</li>`).join('');
    const max = Math.max(1, ...rep.colas.map((c) => c.n));
    const barras = rep.colas.map((c) => `<div class="barra"><span>${esc(c.nombre)}</span><div class="pista"><i style="width:${(c.n / max) * 100}%"></i></div><em>${fmt(c.n)}</em></div>`).join('');
    const maxS = Math.max(1, ...rep.sem);
    const dias = rep.diasIncl.map((i) => `<div class="barra"><span>${PA.DIAS[i]}</span><div class="pista"><i style="width:${(rep.sem[i] / maxS) * 100}%"></i></div><em>${fmt(rep.sem[i])}</em></div>`).join('');
    const laminas = ['Portada', 'Resumen ejecutivo', 'Demanda por cola (gráfico circular)', 'Tickets por cola (barras)', 'Cuándo ingresaron los tickets (columnas)', 'Ingreso diario (línea)']
      .concat(rep.evo.length >= 2 ? ['Evolución mensual (línea)'] : [])
      .concat(['Cierres del mes', 'Detalle de las colas (tabla)'])
      .concat(rep.tiempoCero || rep.primerMes ? ['Indicadores que requieren otra fuente'] : [])
      .concat(['Próximos pasos']);
    $('vista').innerHTML = `
      <h2>Lo que saldrá en la presentación de ${esc(rep.etiqueta)}</h2>
      <div class="kpis">
        <div class="kpi"><b>${fmt(rep.creados)}</b><span>tickets creados en ${esc(rep.mesL)}</span></div>
        <div class="kpi"><b>${fmt(rep.cierres)}</b><span>con fecha de cierre en el mes</span></div>
        <div class="kpi"><b>${rep.tieneEstado ? fmt(rep.alCorte) : '–'}</b><span>del mes figuran cerrados al ${rep.corte.d} de ${esc(rep.corte.mes)}</span></div>
        <div class="kpi"><b>${esc(rep.topPctTxt)} %</b><span>en ${esc(rep.top.nombre)}</span></div>
      </div>
      <h3>Tickets creados por cola</h3>
      <div class="barras">${barras}</div>
      <h3>Tickets creados por día de la semana</h3>
      <div class="barras">${dias}</div>
      <h3>Láminas (${laminas.length})</h3>
      <ol class="laminas">${laminas.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>`;
  }

  function reanalizar() { an = PA.analizar(rows, PA.filtrosDe(cfg)); renderVista(); resumenFiltros(); }
  function resumenFiltros() {
    const c = cfg.colas.filter((x) => !x.incluir).length, g = cfg.agentes.filter((x) => !x.incluir).length, d = cfg.dias.filter((x) => x === false).length;
    $('resumen-filtros').textContent = c || g || d ? `${c} cola(s), ${g} agente(s) y ${d} día(s) excluidos · ${fmt(an.excluidosTotal)} tickets` : 'sin filtros';
  }

  function renderDias() {
    $('cfg-dias').innerHTML = PA.DIAS.map((d, i) => `<label class="${cfg.dias[i] ? '' : 'off'}"><input type="checkbox" data-d="${i}" ${cfg.dias[i] ? 'checked' : ''}> ${d} <small>${fmt(an.diasTotal[i])}</small></label>`).join('');
  }

  function renderConfig() {
    renderDias();
    $('cfg-colas').innerHTML = '<thead><tr><th class="l">Cola en la sábana</th><th>Incluir</th><th>Tickets</th><th class="l">Nombre en la lámina</th></tr></thead><tbody>' +
      cfg.colas.map((c, i) => `<tr data-i="${i}"><td class="raw">${esc(c.raw)}</td><td><input type="checkbox" data-f="incluir" ${c.incluir ? 'checked' : ''} aria-label="Incluir ${esc(c.raw)}"></td><td class="n">${fmt(an.colasTotal[c.raw] || 0)}</td><td><input type="text" data-f="nombre" value="${esc(c.nombre)}"></td></tr>`).join('') + '</tbody>';
    const total = Object.fromEntries(an.agentes.map((x) => [x.clave, x.n]));
    $('msg-agentes').textContent = an.tieneAgente ? '' : 'No encuentro la columna «Agente/Propietario» en este archivo: no se puede filtrar por agente.';
    $('cfg-agentes').innerHTML = an.tieneAgente
      ? '<thead><tr><th class="l">Agente / propietario</th><th>Incluir</th><th>Tickets</th></tr></thead><tbody>' +
        cfg.agentes.map((x, i) => `<tr data-i="${i}"><td class="raw">${esc(x.nombre)}</td><td><input type="checkbox" data-f="incluir" ${x.incluir ? 'checked' : ''} aria-label="Incluir ${esc(x.nombre)}"></td><td class="n">${fmt(total[x.clave] || 0)}</td></tr>`).join('') + '</tbody>'
      : '';
    resumenFiltros();
  }

  // Eventos
  const drop = $('drop'), input = $('archivo');
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', () => { if (input.files[0]) cargarArchivo(input.files[0]); input.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) cargarArchivo(f); });

  $('mes').addEventListener('change', (e) => { ym = e.target.value; renderVista(); });

  $('cfg-colas').addEventListener('input', (e) => {
    const tr = e.target.closest('tr[data-i]'); if (!tr) return;
    const c = cfg.colas[+tr.dataset.i], f = e.target.dataset.f;
    if (f === 'incluir') { c.incluir = e.target.checked; guardar(); reanalizar(); return; }
    c.nombre = e.target.value;
    guardar(); renderVista();
  });
  $('cfg-dias').addEventListener('input', (e) => {
    const i = e.target.dataset.d; if (i == null) return;
    cfg.dias[+i] = e.target.checked;
    e.target.closest('label').classList.toggle('off', !e.target.checked);
    guardar(); reanalizar();
  });
  $('cfg-agentes').addEventListener('input', (e) => {
    const tr = e.target.closest('tr[data-i]'); if (!tr || e.target.dataset.f !== 'incluir') return;
    cfg.agentes[+tr.dataset.i].incluir = e.target.checked;
    guardar(); reanalizar();
  });
  document.querySelectorAll('input[name=graficos]').forEach((r) => r.addEventListener('change', () => { if (r.checked) { cfg.graficos = r.value; guardar(); } }));
  $('proximos').addEventListener('input', (e) => { cfg.proximos = e.target.value; guardar(); });

  function construirPptx() {
    const rep = PA.calcular(an, ym, cfg);
    return { rep, pptx: PA.deck.construir(window.PptxGenJS, rep, cfg, window.PA_ASSETS, { graficos: cfg.graficos }) };
  }
  const fallo = (msg, e) => { $('estado-gen').textContent = ''; mostrarError(msg + (e && e.message ? e.message : e)); };

  $('generar').addEventListener('click', async () => {
    const st = $('estado-gen');
    mostrarError('');
    try {
      st.textContent = 'Generando…';
      const { rep, pptx } = construirPptx();
      await pptx.writeFile({ fileName: PA.deck.nombreArchivo(rep) });
      st.textContent = 'Listo: revisa el archivo descargado antes de enviarlo.';
    } catch (e) { fallo('No pude generar la presentación: ', e); }
  });

  // Botón de Google Slides: solo aparece si hay ID de cliente configurado y la página se abrió por http(s).
  const bs = $('slides');
  if (PA.google && PA.google.disponible()) {
    bs.hidden = false;
    $('generar').classList.add('alt');
    bs.addEventListener('click', async () => {
      const st = $('estado-gen');
      mostrarError('');
      try {
        st.textContent = 'Conectando con Google…';
        await PA.google.conectar(); // primero, para que el clic siga siendo válido para abrir la ventana de Google
        st.textContent = 'Generando y subiendo a Google Drive…';
        const { rep, pptx } = construirPptx();
        const blob = await pptx.write({ outputType: 'blob' });
        const f = await PA.google.subirComoSlides(blob, PA.deck.nombreArchivo(rep));
        st.textContent = 'Listo: ';
        const a = document.createElement('a');
        a.href = f.webViewLink; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'abrir en Google Slides';
        st.appendChild(a);
        window.open(f.webViewLink, '_blank', 'noopener');
      } catch (e) { fallo('No pude crear la presentación en Google Slides: ', e); }
    });
  }
})();
