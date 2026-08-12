// Función intermedia (serverless, corre en Vercel, no en el navegador).
// Traduce la base de datos real de Notion (nombres en español, campos
// específicos de esta cuenta) al formato fijo que el widget espera.
//
// Por qué existe esto en vez de llamar a Notion directo desde el widget:
// 1. El token de Notion no puede quedar expuesto en código que corre
//    en el navegador del cliente — cualquiera podría leerlo.
// 2. Acá es donde se resuelve el mapeo español → claves internas,
//    una sola vez, sin tocar el widget cada vez que cambia un nombre
//    de columna en Notion.

// Convierte un link "de ver" de Google Drive al formato que se puede
// embeber en un iframe, y arma la URL de miniatura automática que
// genera Drive para cualquier video subido.
function parseDriveLink(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  const fileId = match ? match[1] : null;
  if (!fileId) return { embedUrl: url, thumbnailUrl: null };
  return {
    embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
  };
}

// Le pide a Canva la página pública de "compartir" y le saca la miniatura
// de portada (etiqueta og:image), que es lo único que Canva expone sin
// necesitar autenticación. No trae las slides individuales — Canva no
// las expone así; para eso hay que abrir el diseño (se hace en el modal).
async function getCanvaThumbnail(url) {
  try {
    const r = await fetch(url, { redirect: "follow" });
    const html = await r.text();
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null; // si falla, el widget muestra la celda sin imagen, no rompe
  }
}

function buildCanvaEmbedUrl(url) {
  // Agrega el parámetro que hace que Canva muestre el visor embebible
  // (con su propio navegador de slides) en vez de intentar abrir el editor.
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}embed`;
}

export default async function handler(req, res) {
  const { NOTION_TOKEN, NOTION_DATABASE_ID: DEFAULT_DB } = process.env;

  // El ID de la base se puede pasar por URL (?db=...) para reusar este
  // mismo widget con distintos clientes sin desplegar nada nuevo.
  // Si no viene por query, usa la variable de entorno como fallback
  // (así el link de Malva que ya está en producción sigue funcionando
  // sin cambios).
  const NOTION_DATABASE_ID = req.query.db || DEFAULT_DB;

  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return res.status(400).json({
      error:
        "Falta el ID de la base de datos. Pasalo por URL (?db=ID_DE_LA_BASE) o configurá NOTION_DATABASE_ID en Vercel.",
    });
  }

  try {
    const notionRes = await fetch(
      `https://api.notion.com/v1/data_sources/${NOTION_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2025-09-03",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page_size: 50 }),
      }
    );

    if (!notionRes.ok) {
      const errText = await notionRes.text();
      return res.status(notionRes.status).json({
        error: "Notion devolvió un error al consultar la base.",
        detail: errText,
      });
    }

    const data = await notionRes.json();

    // ─── MAPEO — acá se traduce lo que hay en la base real ───
    // "Todos los posteos" (title)   -> nombre
    // "Se postea" (date)            -> fecha
    // "Tipo de recurso" (select)    -> recursoTipo: Canva / Imagen / Video
    // "Link del diseño" (url)       -> según recursoTipo, se procesa distinto
    //
    // Las páginas de tipo Canva necesitan una consulta extra (traer la
    // miniatura), por eso se procesan todas en paralelo con Promise.all
    // en vez de una por una — más rápido cuando hay varias filas.
    const items = await Promise.all(
      (data.results || []).map(async (page) => {
        const props = page.properties || {};

        const nombre =
          props["Todos los posteos"]?.title?.[0]?.plain_text?.trim() ||
          "(Sin nombre)";
        const fecha = props["Se postea"]?.date?.start || null;
        const formato = props["Formato"]?.select?.name || null;
        const recursoTipo = props["Tipo de recurso"]?.select?.name || null;
        const link = props["Link del diseño"]?.url || null;

        let slides = [];
        let modalTipo = "imagen"; // imagen | canva | video
        let embedUrl = null;

        if (link && recursoTipo === "Imagen") {
          slides = [link];
          modalTipo = "imagen";
        } else if (link && recursoTipo === "Canva") {
          const thumb = await getCanvaThumbnail(link);
          slides = thumb ? [thumb] : [];
          modalTipo = "canva";
          embedUrl = buildCanvaEmbedUrl(link);
        } else if (link && recursoTipo === "Video") {
          const { embedUrl: driveEmbed, thumbnailUrl } = parseDriveLink(link);
          slides = thumbnailUrl ? [thumbnailUrl] : [];
          modalTipo = "video";
          embedUrl = driveEmbed;
        }

        return {
          id: page.id,
          nombre,
          fecha,
          tipo: formato,
          recursoTipo,
          modalTipo,
          embedUrl,
          slides,
        };
      })
    );

    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: "Fallo la conexión con Notion.", detail: String(err) });
  }
}
