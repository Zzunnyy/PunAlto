// Uso (SIN_FILTROS=1 desactiva las exclusiones por defecto): node test/smoke.js "<sabana.xlsx>" [AAAA-MM] [salida.pptx]
const path = require('path');
const XLSX = require('../vendor/xlsx.full.min.js');
const PA = require('../core.js');
const deck = require('../deck.js');
const vm = require('vm'), fs = require('fs');

const [, , archivo, mesArg, salida] = process.argv;
if (!archivo) { console.error('Falta la ruta de la sábana'); process.exit(1); }

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets.js'), 'utf8'), ctx);
// El bundle de PptxGenJS es para navegador: se carga en un contexto con `window`.
const bro = { Buffer, console, setTimeout, clearTimeout, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, Promise };
bro.window = bro; bro.self = bro; bro.global = bro;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../vendor/pptxgen.bundle.js'), 'utf8'), bro);
const PptxGenJS = bro.PptxGenJS;

const wb = XLSX.read(fs.readFileSync(archivo), { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
const an0 = PA.analizar(rows);
const cfg = PA.mezclarConfig(an0, null);
if (process.env.SIN_FILTROS) { cfg.colas.forEach((c) => { c.incluir = true; }); cfg.agentes.forEach((a) => { a.incluir = true; }); }
const an = PA.analizar(rows, PA.filtrosDe(cfg));
console.log('excluidos por filtros:', an.excluidosTotal, '| colas excluidas:', cfg.colas.filter((c) => !c.incluir).map((c) => c.raw).join(', ') || '-', '| agentes excluidos:', cfg.agentes.filter((a) => !a.incluir).map((a) => a.nombre).join(', ') || '-');
console.log('filas', an.n, '| meses', an.meses.join(','), '| max', JSON.stringify(an.max), '| tiempoCero', an.tiempoCero, '| dup', an.dup);
const ym = mesArg || PA.mesPorDefecto(an);
const rep = PA.calcular(an, ym, cfg);
console.log('mes', rep.etiqueta, '| creados', rep.creados, '| cierres', rep.cierres, '| alCorte', rep.alCorte, '| pct', rep.pctCierre);
console.log('top', rep.top.nombre, rep.top.n, rep.topPctTxt + '%', '| top5', rep.top5Suma, rep.top5PctTxt + '%', '| otras', rep.resto5.length);
console.log('colas', rep.colas.map((c) => `${c.nombre}=${c.n}`).join(' | '));
console.log('semana', PA.DIAS_CORTO.map((d, i) => `${d}=${rep.sem[i]}`).join(' '), '| finde', rep.finde, '| dias top', rep.ordenSem.slice(0, 2).map((i) => PA.DIAS[i]).join(', '));
console.log('diario max', rep.maxDia + 1, rep.diario[rep.maxDia], '| evo', rep.evo.map((e) => `${e.etiqueta}:${e.creados}/${e.cerrados}`).join(' '), '| var', rep.varPrevio);
rep.avisos.forEach((a) => console.log(`[${a.nivel}]`, a.texto));

const pptx = deck.construir(PptxGenJS, rep, cfg, ctx.window.PA_ASSETS);
const out = salida || path.join(__dirname, 'salida.pptx');
pptx.write({ outputType: 'nodebuffer' }).then((buf) => { fs.writeFileSync(out, buf); console.log('pptx escrito en', out, buf.length, 'bytes'); });
