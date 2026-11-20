# Informe mensual · Mesa de Ayuda (MVP)

Página web local que lee la sábana de tickets y genera la presentación mensual (`.pptx` editable) con el
diseño «Ejecutiva BN» del informe de mayo 2026: fondo blanco, azul oscuro y gris, fotos de Punto Alto.

## Usar
1. Abrir `index.html` con doble clic (no necesita instalación ni internet).
2. Arrastrar la sábana (.xlsx/.xls/.csv). Se procesa en el navegador; no se envía a ningún servidor.
3. Elegir el mes (por defecto, el último mes completo) y revisar los avisos.
4. Revisar los **filtros** (qué colas y qué agentes se excluyen) y, si hace falta, el nombre de las colas y los próximos pasos. Todo se guarda en el navegador.
5. «Descargar presentación». Abrirla en PowerPoint o importarla a Google Slides y revisarla antes de enviar.

## Filtros: tickets que no entran al informe
En «Ajustes > Filtros» se desmarcan días de la semana (según la fecha de creación), colas y agentes/propietarios (columna `Agente/Propietario`). Un ticket excluido se descarta
**antes de calcular**: no cuenta en el total, los cierres, los días de la semana, el ingreso diario, la evolución mensual ni las colas.
Por defecto se excluyen las colas **Incidentes** y **Producción** y los tickets de **Marco Manríquez** y **Washington Morales**
(criterios del equipo de Soporte, pedidos por Camila Ruiz); todos los días vienen incluidos. Un ticket se excluye si cumple *cualquiera* de los criterios; por eso volver a
incluir una cola no la devuelve si su agente sigue excluido. Los días desmarcados tampoco aparecen en el gráfico «Cuándo ingresaron los tickets». La página avisa cuántos tickets del mes quedaron fuera.

## Gráficos: imagen o editables
En «Ajustes > Gráficos» se elige cómo se incluyen en el `.pptx`:
- **Imagen** (por defecto): PNG de alta resolución dibujados por la página. Se ven igual en PowerPoint, Google Slides, Keynote y la vista previa de Mac, pero no se pueden editar.
- **Editables**: gráficos nativos de PowerPoint. Algunos visores (Google Slides, vista previa de Mac) pueden no mostrarlos.

## Láminas y gráficos
| Lámina | Gráfico | Fuente en la sábana |
|---|---|---|
| Portada, resumen ejecutivo | – | `Creado`, `Fecha de cierre` |
| Demanda por cola | Circular (dona) | `Cola` |
| Tickets por cola | Barras (5 mayores + «Otras») | `Cola` |
| Cuándo ingresaron los tickets | Columnas por día de la semana | `Creado` |
| Ingreso diario de tickets | **Línea** por día del mes | `Creado` |
| Evolución mensual (solo si hay 2+ meses) | **Línea** creados vs cerrados | `Creado`, `Fecha de cierre` |
| Cierres del mes | – | `Fecha de cierre`, `Estado` |
| Detalle de las colas | Tabla | `Cola` |
| Indicadores que requieren otra fuente (solo si aplica) | – | `Tiempo contabilizado` en cero; primer mes de la sábana |
| Próximos pasos | – | Ajustes (o propuestos según los datos) |

Reglas: *creados* = `Creado` empieza por AAAA-MM; *cierres* = `Fecha de cierre` empieza por AAAA-MM
(incluye tickets de meses anteriores); *cerrados al corte* = tickets del mes con `Estado` «closed…»;
el corte es la fecha más reciente de `Creado` en el archivo. Los valores de mayo coinciden con el informe v4.

## Conectar con Google Slides (botón «Crear en Google Slides»)
El botón sube el `.pptx` al Drive de quien inicia sesión, convertido a Google Slides, y lo abre. Aparece solo si
`config.js` tiene un ID de cliente y la página se abre por `http(s)` (Google no permite el inicio de sesión desde `file://`).

Configuración única, en https://console.cloud.google.com (cuenta de Punto Alto):
1. Elegir o crear un proyecto. No sirven las credenciales de «aplicación de escritorio» de `PuntoAlto/credentials.json`.
2. **APIs y servicios > Biblioteca**: habilitar **Google Drive API**.
3. **Pantalla de consentimiento de OAuth**: tipo **Interno** (solo cuentas del Workspace de Punto Alto). Alcance: `.../auth/drive.file`.
4. **Credenciales > Crear credenciales > ID de cliente de OAuth > Aplicación web**. En «Orígenes autorizados de JavaScript» agregar
   la URL donde se abrirá la página (p. ej. `http://localhost:8765` o la URL publicada). No hace falta URI de redirección.
5. Copiar el ID (termina en `.apps.googleusercontent.com`) en `config.js`.

Para abrir la página en local: `python3 -m http.server 8765` dentro de esta carpeta y entrar a `http://localhost:8765`.
Alcance `drive.file`: la página solo ve los archivos que crea; no lee el resto del Drive.

## Probar la lógica sin navegador
```
node test/filtros.js                                   # pruebas automáticas de los filtros
node test/smoke.js "<sabana.xlsx>" 2026-08 salida.pptx  # resumen de cifras y genera el .pptx (SIN_FILTROS=1 desactiva los filtros)
```

## Librerías incluidas (carpeta `vendor/`)
SheetJS 0.18.5 (lectura de Excel) y PptxGenJS 3.12.0 (generación de .pptx), con sus licencias.
Las fotos y el logo (`assets/`) salen del informe de mayo; `assets.js` las incluye en base64 para que la página funcione sin servidor.
