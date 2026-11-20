/* Conexión con Google: inicio de sesión (Google Identity Services) y subida del .pptx a Drive convertido a Google Slides.
   Alcance drive.file: la página solo puede ver los archivos que ella misma crea. */
(function (root) {
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  let token = null, expira = 0;

  const clientId = () => String((root.PA_CONFIG && root.PA_CONFIG.googleClientId) || '').trim();
  // Google no permite el inicio de sesión desde file://; hace falta http(s) (localhost o la URL publicada).
  const disponible = () => !!clientId() && /^https?:$/.test(root.location.protocol);

  function cargarGIS() {
    if (root.google && root.google.accounts && root.google.accounts.oauth2) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = res;
      s.onerror = () => rej(new Error('No pude cargar el inicio de sesión de Google (¿sin internet?).'));
      document.head.appendChild(s);
    });
  }

  // Debe llamarse directamente desde un clic, antes de cualquier espera larga, para que el navegador no bloquee la ventana.
  async function conectar() {
    if (token && Date.now() < expira - 60000) return token;
    await cargarGIS();
    return new Promise((res, rej) => {
      const tc = root.google.accounts.oauth2.initTokenClient({
        client_id: clientId(),
        scope: SCOPE,
        callback: (r) => {
          if (r.error) return rej(new Error('Google rechazó el acceso: ' + (r.error_description || r.error)));
          token = r.access_token;
          expira = Date.now() + (r.expires_in || 3600) * 1000;
          res(token);
        },
        error_callback: (e) => rej(new Error('No se completó el inicio de sesión (' + ((e && e.type) || 'cancelado') + ').')),
      });
      tc.requestAccessToken();
    });
  }

  async function subirComoSlides(blob, nombreArchivo) {
    const t = await conectar();
    const meta = { name: nombreArchivo.replace(/\.pptx$/i, ''), mimeType: 'application/vnd.google-apps.presentation' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', new Blob([blob], { type: PPTX }));
    const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST', headers: { Authorization: 'Bearer ' + t }, body: form,
    });
    if (!r.ok) {
      let m = '';
      try { m = (await r.json()).error.message; } catch (e) { /* sin detalle */ }
      if (r.status === 401) token = null;
      throw new Error('Google Drive respondió ' + r.status + (m ? ': ' + m : ''));
    }
    return r.json();
  }

  root.PA = Object.assign(root.PA || {}, { google: { disponible, conectar, subirComoSlides } });
})(window);
