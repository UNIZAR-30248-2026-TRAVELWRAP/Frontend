import { useCallback, useEffect, useRef, useState } from "react"
import { urlDeDocumento, type Documento } from "../services/documentosApi"
import { NUNITO } from "../styles/tokens"
import { descargarDocumento, mensajeAlAbrir } from "../utils/documentos"
import Icon from "./Icon"
import VisorPdf from "./VisorPdf"

type VistaPreviaDocumentoProps = {
  viajeId: string
  documento: Documento
  tokenSesion: string
  onCerrar: () => void
}

const estiloBoton = {
  minHeight: 44,
  minWidth: 44,
  borderRadius: 22,
  border: "none",
  background: "rgba(255,255,255,0.18)",
  color: "white",
  fontFamily: NUNITO,
  fontSize: 13,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "0 14px",
  cursor: "pointer",
  flexShrink: 0,
} as const

// Diálogo a pantalla completa con el contenido de un documento: la imagen ampliada o las páginas del PDF
export default function VistaPreviaDocumento({ viajeId, documento, tokenSesion, onCerrar }: VistaPreviaDocumentoProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [intento, setIntento] = useState(0)
  const [descargando, setDescargando] = useState(false)
  const botonCerrar = useRef<HTMLButtonElement>(null)

  // Cada vez que se abre (o se reintenta) se pide un enlace nuevo, porque caducan a los 5 minutos
  useEffect(() => {
    let vigente = true
    urlDeDocumento(viajeId, documento.id, tokenSesion)
      .then((datos) => {
        if (vigente) setUrl(datos.url)
      })
      .catch((e) => {
        if (vigente) setError(mensajeAlAbrir(e))
      })
    return () => {
      vigente = false
    }
  }, [viajeId, documento.id, tokenSesion, intento])

  useEffect(() => {
    botonCerrar.current?.focus()
    const desbordeAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = desbordeAnterior
    }
  }, [])

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar()
    }
    window.addEventListener("keydown", alPulsar)
    return () => window.removeEventListener("keydown", alPulsar)
  }, [onCerrar])

  const alFallarElContenido = useCallback(() => {
    setUrl(null)
    setError("No se ha podido mostrar el documento. Comprueba la conexión e inténtalo de nuevo")
  }, [])

  const reintentar = () => {
    setError("")
    setUrl(null)
    setIntento((anterior) => anterior + 1)
  }

  const handleDescargar = async () => {
    setDescargando(true)
    try {
      await descargarDocumento(viajeId, documento.id, tokenSesion)
    } catch (e) {
      setUrl(null)
      setError(mensajeAlAbrir(e))
    } finally {
      setDescargando(false)
    }
  }

  const esPdf = documento.tipo_mime === "application/pdf"

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Documento: ${documento.nombre}`}
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        zIndex: 60,
        background: "rgba(8,16,32,0.96)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 12px 12px 16px" }}>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: NUNITO,
            color: "rgba(255,255,255,0.9)",
            fontSize: 14,
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {documento.nombre}
        </span>
        <button type="button" onClick={handleDescargar} disabled={descargando} style={{ ...estiloBoton, opacity: descargando ? 0.6 : 1 }}>
          <Icon name="download" size={16} color="white" strokeWidth={2.2} />
          Descargar
        </button>
        <button ref={botonCerrar} type="button" onClick={onCerrar} style={estiloBoton}>
          <Icon name="close" size={16} color="white" strokeWidth={2.2} />
          Cerrar
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {error ? (
          <div style={{ margin: "auto", padding: 24, textAlign: "center" }}>
            <p role="alert" style={{ fontFamily: NUNITO, color: "white", fontSize: 14, margin: "0 0 16px", overflowWrap: "anywhere" }}>
              {error}
            </p>
            <button type="button" onClick={reintentar} style={{ ...estiloBoton, margin: "0 auto" }}>
              Reintentar
            </button>
          </div>
        ) : !url ? (
          <p style={{ margin: "auto", fontFamily: NUNITO, color: "rgba(255,255,255,0.8)", fontSize: 14 }}>Cargando...</p>
        ) : esPdf ? (
          <VisorPdf url={url} onError={alFallarElContenido} />
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px 16px" }}>
            <img
              src={url}
              alt={documento.nombre}
              onError={alFallarElContenido}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", borderRadius: 8 }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
