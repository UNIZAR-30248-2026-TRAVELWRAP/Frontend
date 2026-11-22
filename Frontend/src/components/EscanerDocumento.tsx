import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { ApiError } from "../services/authApi"
import { escanearDocumento, type ResultadoEscaneo } from "../services/escaneoApi"
import { C, NUNITO, SHADOWS } from "../styles/tokens"
import Icon from "./Icon"

type EscanerDocumentoProps = {
  viajeId: string
  tokenSesion: string
  onCerrar: () => void
  // Se llama cuando el backend ha detectado el tipo del documento
  onEscaneado: (resultado: ResultadoEscaneo) => void
}

// Fotos que acepta el escáner: el backend las comprueba por su contenido, y aquí se avisa antes de enviarlas
const TIPOS_FOTO = ["image/jpeg", "image/png"]
const MAX_BYTES_FOTO = 8_000_000

const motivoParaNoEscanear = (foto: File): string | null => {
  if (!TIPOS_FOTO.includes(foto.type)) return "Solo se pueden escanear fotos JPEG o PNG"
  if (foto.size === 0) return "La foto está vacía"
  if (foto.size > MAX_BYTES_FOTO) return "La foto no puede ocupar más de 8 MB"
  return null
}

// Ventana «Escanear documento». Muestra la cámara dentro del marco, como en el prototipo: se captura la imagen
// y el backend detecta si es un gasto, una actividad u otro documento. Si la cámara no está disponible,
// se puede elegir una foto de la galería
export default function EscanerDocumento({ viajeId, tokenSesion, onCerrar, onEscaneado }: EscanerDocumentoProps) {
  const entrada = useRef<HTMLInputElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [camara, setCamara] = useState<MediaStream | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [error, setError] = useState("")

  // La cámara se apaga al cerrar la ventana o al salir de la pantalla
  const apagarCamara = (stream: MediaStream | null) => stream?.getTracks().forEach((pista) => pista.stop())
  useEffect(() => () => apagarCamara(camara), [camara])

  // Muestra el vídeo de la cámara dentro del marco en cuanto está disponible
  useEffect(() => {
    if (camara && video.current) {
      video.current.srcObject = camara
      void video.current.play().catch(() => undefined)
    }
  }, [camara])

  // Envía la foto al backend y entrega el tipo detectado
  const escanear = async (foto: File) => {
    const motivo = motivoParaNoEscanear(foto)
    if (motivo) {
      setError(motivo)
      return
    }

    setError("")
    setAnalizando(true)
    try {
      const resultado = await escanearDocumento(viajeId, foto, tokenSesion)
      onEscaneado(resultado)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se ha podido leer el documento. Prueba con otra foto.")
    } finally {
      setAnalizando(false)
    }
  }

  // Abre la cámara trasera (o la frontal si solo hay esa). Si el navegador no puede, se elige una foto de la galería
  const abrirCamara = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      entrada.current?.click()
      return
    }
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      setCamara(stream)
    } catch {
      setError("No se ha podido abrir la cámara. Revisa que la has permitido en el navegador, o elige una foto de la galería.")
    }
  }

  // Captura el fotograma actual del vídeo y lo analiza
  const capturar = () => {
    const vid = video.current
    const lienzoActual = lienzo.current
    if (!vid || !lienzoActual || !vid.videoWidth) {
      setError("La cámara todavía no está lista. Inténtalo de nuevo en un momento.")
      return
    }
    lienzoActual.width = vid.videoWidth
    lienzoActual.height = vid.videoHeight
    lienzoActual.getContext("2d")?.drawImage(vid, 0, 0, vid.videoWidth, vid.videoHeight)
    lienzoActual.toBlob(
      (blob) => {
        apagarCamara(camara)
        setCamara(null)
        if (!blob) {
          setError("No se ha podido capturar la imagen. Prueba de nuevo.")
          return
        }
        void escanear(new File([blob], "documento.jpg", { type: "image/jpeg" }))
      },
      "image/jpeg",
      0.92,
    )
  }

  const cerrar = () => {
    apagarCamara(camara)
    setCamara(null)
    onCerrar()
  }

  const alElegirFoto = (evento: ChangeEvent<HTMLInputElement>) => {
    const foto = evento.target.files?.[0]
    // Permite volver a elegir la misma foto si el usuario la repite después de un error
    evento.target.value = ""
    if (foto) void escanear(foto)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-escaner"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(360px, 100%)",
          background: C.card,
          borderRadius: 20,
          padding: 20,
          boxShadow: SHADOWS.cardRaised,
          fontFamily: NUNITO,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: C.lightAccent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="camera" size={20} color={C.accent} strokeWidth={2.2} />
          </span>
          <div>
            <h2 id="titulo-escaner" style={{ margin: 0, fontSize: 19, fontWeight: 800, color: C.navy }}>
              Escanear documento
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
              Escanea una actividad, un ticket o cualquier texto.
            </p>
          </div>
        </div>

        <div style={{ background: C.navy, borderRadius: 16, padding: 12, marginBottom: 16 }}>
          <div
            style={{
              position: "relative",
              border: "2px dashed rgba(255,255,255,0.45)",
              borderRadius: 12,
              height: 200,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: "rgba(255,255,255,0.8)",
              fontSize: 13,
              textAlign: "center",
              padding: camara ? 0 : 12,
            }}
          >
            {camara ? (
              <video
                ref={video}
                muted
                playsInline
                aria-label="Vista de la cámara"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <>
                <Icon name="document" size={36} color="rgba(255,255,255,0.7)" strokeWidth={1.8} />
                {analizando ? "Analizando el documento..." : "Coloca el documento dentro del marco"}
              </>
            )}
          </div>
          <canvas ref={lienzo} style={{ display: "none" }} aria-hidden="true" />
        </div>

        {error && (
          <p role="alert" style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: C.red }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={cerrar}
            disabled={analizando}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: C.bg,
              color: C.muted,
              fontFamily: NUNITO,
              fontSize: 14,
              fontWeight: 800,
              cursor: analizando ? "wait" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={camara ? capturar : () => void abrirCamara()}
            disabled={analizando}
            style={{
              flex: 1.4,
              minHeight: 46,
              borderRadius: 14,
              border: "none",
              background: C.blue,
              color: "white",
              fontFamily: NUNITO,
              fontSize: 14,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: analizando ? "wait" : "pointer",
              opacity: analizando ? 0.7 : 1,
            }}
          >
            <Icon name="camera" size={16} color="white" strokeWidth={2.5} />
            {analizando ? "Analizando..." : camara ? "Capturar" : "Abrir cámara"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={analizando}
          style={{
            width: "100%",
            marginTop: 10,
            minHeight: 40,
            border: "none",
            background: "transparent",
            color: C.blue,
            fontFamily: NUNITO,
            fontSize: 13,
            fontWeight: 700,
            cursor: analizando ? "wait" : "pointer",
          }}
        >
          Elegir una foto de la galería
        </button>

        {/* Selector de archivos: la galería, o la cámara en los móviles que la ofrecen así */}
        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png"
          onChange={alElegirFoto}
          aria-label="Foto del documento"
          style={{ display: "none" }}
          tabIndex={-1}
        />
      </div>
    </div>
  )
}
