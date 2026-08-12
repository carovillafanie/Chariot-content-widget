import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Calendar, ExternalLink, RefreshCw } from "lucide-react";

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
  const isFirst = index === 0;
  const isLast = index === item.slides.length - 1;

  const next = () => {
    if (isLast) return;
    setIndex((i) => i + 1);
  };
  const prev = () => {
    if (isFirst) return;
    setIndex((i) => i - 1);
  };

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
                disabled={isFirst}
                aria-label="Slide anterior"
                style={navBtnStyle("left", isFirst)}
              >
                <ChevronLeft size={20} color="#FAF7F2" />
              </button>
              <button
                onClick={next}
                disabled={isLast}
                aria-label="Slide siguiente"
                style={navBtnStyle("right", isLast)}
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

function navBtnStyle(side, disabled) {
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
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.25 : 1,
  };
}

export default function ContentGridWidget() {
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [errorDetail, setErrorDetail] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = React.useCallback((isManualRefresh) => {
    // Reenvía el ?db=... de la URL de la página (si existe) hacia la
    // función serverless, para que cada cliente vea su propia base
    // usando el mismo widget desplegado una sola vez.
    const params = new URLSearchParams(window.location.search);
    const dbParam = params.get("db");
    const url = dbParam
      ? `/api/content?db=${encodeURIComponent(dbParam)}`
      : "/api/content";

    if (isManualRefresh) setRefreshing(true);

    fetch(url)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Error desconocido");
        setItems(data.items || []);
        setStatus("ok");
      })
      .catch((err) => {
        setErrorDetail(String(err.message || err));
        setStatus("error");
      })
      .finally(() => {
        if (isManualRefresh) setRefreshing(false);
      });
  }, []);

  React.useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const sorted = useMemo(
    () =>
      [...items]
        .filter((i) => i.fecha)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
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
        padding: "16px 0",
      }}
    >
      <style>{`
        .chariot-grid-cell:hover .chariot-name-overlay {
          opacity: 1 !important;
        }
        @keyframes chariot-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "10px",
            padding: "0 10px",
          }}
        >
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            aria-label="Refrescar contenido"
            style={{
              height: "34px",
              padding: "0 14px",
              borderRadius: "9px",
              border: "1px solid #E4E0D8",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              cursor: refreshing ? "default" : "pointer",
            }}
          >
            <RefreshCw
              size={15}
              color="#5A564E"
              style={{
                animation: refreshing ? "chariot-spin 0.8s linear infinite" : "none",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontFamily: "'IBM Plex Mono', monospace",
                color: "#5A564E",
              }}
            >
              Refrescar
            </span>
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "2px",
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
                className="chariot-grid-cell"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: "#111",
                  aspectRatio: "1080 / 1350",
                  width: "100%",
                }}
              >
                <img
                  src={item.slides[0]}
                  alt={item.nombre}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
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
                <div
                  className="chariot-name-overlay"
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "flex-end",
                    padding: "10px",
                    background:
                      "linear-gradient(to top, rgba(20,18,15,0.75) 0%, rgba(20,18,15,0) 55%)",
                    opacity: 0,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#FAF7F2",
                      lineHeight: 1.3,
                      fontFamily: "'Newsreader', Georgia, serif",
                    }}
                  >
                    {item.nombre}
                  </span>
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
