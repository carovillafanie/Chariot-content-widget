// Herramienta de diagnóstico, no forma parte del widget en sí.
// Recibe cualquier ID de página/base de Notion (el que sea, copiado de
// donde sea) y devuelve el ID REAL de la base de datos que hace falta
// para armar el link del widget (?db=...).
//
// Por qué hace falta esto: el ID que aparece en la URL de Notion no
// siempre es el mismo que la API necesita para consultar la base — a
// veces hay un ID de "página contenedora" distinto del ID de la base
// de datos en sí. Esta función usa el mismo token que ya está
// configurado en Vercel para preguntarle a Notion directamente cuál
// es el ID correcto, en vez de que lo saques a mano del link.

function normalizeId(raw) {
  // Acepta el ID con o sin guiones, y también una URL completa —
  // extrae solo el bloque de 32 caracteres.
  const match = raw.match(/([a-f0-9]{32}|[a-f0-9-]{36})/i);
  return match ? match[0].replace(/-/g, "") : raw.replace(/-/g, "");
}

export default async function handler(req, res) {
  const { NOTION_TOKEN } = process.env;
  const { id } = req.query;

  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: "Falta NOTION_TOKEN en Vercel." });
  }
  if (!id) {
    return res.status(400).json({
      error: "Pasá el ID o el link completo de Notion como ?id=...",
    });
  }

  const cleanId = normalizeId(id);

  // Intento 1: tratar el ID como una base de datos directamente.
  const dbRes = await fetch(`https://api.notion.com/v1/databases/${cleanId}`, {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2025-09-03",
    },
  });
  const dbData = await dbRes.json();

  if (dbRes.ok) {
    return res.status(200).json({
      encontrado_como: "base de datos",
      titulo: dbData.title?.[0]?.plain_text || "(sin título)",
      data_sources: dbData.data_sources,
      usar_este_id_en_el_widget:
        dbData.data_sources?.[0]?.id?.replace(/-/g, "") || null,
    });
  }

  // Intento 2: si no era una base de datos, capaz es una página —
  // buscamos si tiene una base de datos adentro.
  const pageRes = await fetch(`https://api.notion.com/v1/pages/${cleanId}`, {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2025-09-03",
    },
  });
  const pageData = await pageRes.json();

  if (pageRes.ok) {
    return res.status(200).json({
      encontrado_como: "página (no es una base de datos directamente)",
      detalle:
        "Este ID es una página normal, no una base de datos. Abrí la base de datos en sí (no la página que la contiene) y volvé a copiar el link desde ahí.",
      pageData,
    });
  }

  return res.status(404).json({
    error: "Notion no reconoce este ID ni como base de datos ni como página.",
    detalle_base: dbData,
    detalle_pagina: pageData,
    posibles_causas: [
      "La base todavía no está compartida con la integración (Conexiones → agregar la integración del token de Vercel).",
      "El ID está incompleto o mal copiado.",
    ],
  });
}
