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

    // ─── MAPEO — acá se traduce lo que hay en la base real de Malva ───
    // "Todos los posteos" (title) -> nombre
    // "Se postea" (date)          -> fecha
    // No existe todavía un campo de imagen/Canva, así que slides queda
    // vacío a propósito: el widget tiene que poder mostrar eso sin romperse.
    const items = (data.results || []).map((page) => {
      const props = page.properties || {};

      const nombre =
        props["Todos los posteos"]?.title?.[0]?.plain_text?.trim() ||
        "(Sin nombre)";

      const fecha = props["Se postea"]?.date?.start || null;

      const formato = props["Formato"]?.select?.name || null;

      return {
        id: page.id,
        nombre,
        fecha,
        tipo: formato,
        canvaUrl: null, // no existe el campo todavía
        slides: [], // vacío a propósito — el widget debe mostrar un placeholder
      };
    });

    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: "Fallo la conexión con Notion.", detail: String(err) });
  }
}
