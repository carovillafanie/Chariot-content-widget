import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Calendar, ExternalLink } from "lucide-react";

const TIPO_COLOR = {
  Reel: "#C9A87C",
  Carrusel: "#7C9A92",
  Estático: "#A87C9A",
};

function formatFecha(fechaStr) {
  const d = new Date(fechaStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function Slider({ item, onClose }) {
  const [index, setIndex] = useState(0);
  const hasMultiple = item.slides.length > 1;

  const next = () => setIndex((i) => (i + 1) % item.slides.length);
  const prev = () => setIndex((i) => (i - 1 + item.slides.length) % item.slides.length);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 18, 15, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "#FAF7F2",
          borderRadius: "4px",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: "relative", background: "#111" }}>
          {item.slides.length > 0 ? (
            <img
              src={item.slides[index]}
              alt={`${item.nombre} — slide ${index + 1}`}
              style={{
                width: "100%",
                aspectRatio: "4/5",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                aspectRatio: "4/5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#5A564E",
                fontSize: "11px",
                fontFamily: "'IBM Plex Mono', monospace",
                textAlign: "center",
                padding: "0 24px",
              }}
            >
              Sin imagen todavía
            </div>
          )}
          {hasMultiple && (
            <>
              <button
                onClick={prev}
                aria-label="Slide anterior"
                style={navBtnStyle("left")}
              >
                <ChevronLeft size={20} color="#FAF7F2" />
              </button>
              <button
                onClick={next}
                aria-label="Slide siguiente"
                style={navBtnStyle("right")}
              >
                <ChevronRight size={20} color="#FAF7F2" />
              </button>
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: "5px",
                }}
              >
                {item.slides.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: i === index ? "#FAF7F2" : "rgba(250,247,242,0.4)",
                    }}
                  />
                ))}
              </div>
            </>
          )}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(20,18,15,0.5)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} color="#FAF7F2" />
          </button>
        </div>

        <div style={{ padding: "18px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: TIPO_COLOR[item.tipo] || "#8A8478",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {item.tipo}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#8A8478",
                fontFamily: "'IBM Plex Mono', monospace",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Calendar size={11} />
              {formatFecha(item.fecha)}
            </span>
          </div>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "#2B2620",
              margin: "0 0 12px 0",
              fontFamily: "'Newsreader', Georgia, serif",
              lineHeight: 1.3,
            }}
          >
            {item.nombre}
          </h3>
          {item.canvaUrl && (
            <a
              href={item.canvaUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "#2B2620",
                textDecoration: "none",
                borderBottom: "1px solid #2B2620",
                paddingBottom: "1px",
              }}
            >
              Abrir en Canva <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function navBtnStyle(side) {
  return {
    position: "absolute",
    top: "50%",
    [side]: "8px",
    transform: "translateY(-50%)",
    background: "rgba(20,18,15,0.4)",
    border: "none",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
}

export default function ContentGridWidget() {
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [errorDetail, setErrorDetail] = useState("");

  React.useEffect(() => {
    fetch("/api/content")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Error desconocido");
        setItems(data.items || []);
        setStatus("ok");
      })
      .catch((err) => {
        setErrorDetail(String(err.message || err));
        setStatus("error");
      });
  }, []);

  const sorted = useMemo(
    () =>
      [...items]
        .filter((i) => i.fecha)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)),
    [items]
  );

  if (status === "loading") {
    return (
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          background: "#FAF7F2",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8A8478",
          fontSize: "13px",
        }}
      >
        Cargando contenido desde Notion…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          background: "#FAF7F2",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "480px", color: "#8A3A2E", fontSize: "13px" }}>
          No se pudo conectar con Notion.
          <div style={{ marginTop: "8px", color: "#5A564E", fontSize: "12px" }}>
            {errorDetail}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Newsreader', Georgia, serif",
        background: "#FAF7F2",
        minHeight: "100vh",
        padding: "32px 20px",
      }}
    >
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8A8478",
              fontFamily: "'IBM Plex Mono', monospace",
              marginBottom: "4px",
            }}
          >
            Chariot · Calendario de contenido
          </div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 500,
              color: "#2B2620",
              margin: 0,
            }}
          >
            Próximas publicaciones
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "14px",
          }}
        >
          {sorted.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  position: "relative",
                  borderRadius: "3px",
                  overflow: "hidden",
                  background: "#111",
                }}
              >
                <img
                  src={item.slides[0]}
                  alt={item.nombre}
                  style={{
                    width: "100%",
                    aspectRatio: "4/5",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                {item.slides.length > 1 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "rgba(20,18,15,0.55)",
                      color: "#FAF7F2",
                      fontSize: "10px",
                      fontFamily: "'IBM Plex Mono', monospace",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}
                  >
                    1/{item.slides.length}
                  </div>
                )}
              </div>
              <div style={{ marginTop: "7px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: TIPO_COLOR[item.tipo] || "#8A8478",
                    marginBottom: "2px",
                  }}
                >
                  {formatFecha(item.fecha)}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#2B2620",
                    lineHeight: 1.3,
                  }}
                >
                  {item.nombre}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <Slider item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
