import { useEffect, useRef, useState, type FormEvent } from "react"
import BarraInferior, { ALTO_BARRA_INFERIOR, type SeccionViaje } from "../components/BarraInferior"
import Heading from "../components/Heading"
import { ApiError } from "../services/authApi"
import { enviarMensaje, listarMensajes, type Mensaje } from "../services/chatApi"
import { escucharMensajes } from "../services/chatTiempoReal"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { estiloAlerta } from "../styles/formulario"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"

// Mismo tamaño que la API devuelve de una vez y el límite de un mensaje
const MENSAJES_POR_PAGINA = 50
const MAX_TEXTO = 1000

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const hora = (fecha: string) => new Date(fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })

type ChatProps = {
  viajeId: string
  tokenSesion: string
  // Usuario de la sesión: sus mensajes van a la derecha
  usuarioId: string
  onVolver?: () => void
  onAbrirGaleria?: () => void
  onCambiarSeccion?: (seccion: SeccionViaje) => void
}

// Pantalla: Chat del grupo (mensajes en tiempo real y envío de mensajes)
export default function Chat({ viajeId, tokenSesion, usuarioId, onVolver, onAbrirGaleria, onCambiarSeccion }: ChatProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [hayAnteriores, setHayAnteriores] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState("")
  const finRef = useRef<HTMLDivElement>(null)

  // El viaje (para saber si admite mensajes) y los últimos mensajes
  useEffect(() => {
    let vigente = true
    Promise.all([obtenerViaje(viajeId, tokenSesion), listarMensajes(viajeId, tokenSesion)])
      .then(([datosViaje, lista]) => {
        if (!vigente) return
        setViaje(datosViaje)
        setMensajes(lista.mensajes)
        setHayAnteriores(lista.mensajes.length === MENSAJES_POR_PAGINA)
      })
      .catch((e) => {
        if (vigente) setError(`No se han podido cargar los mensajes: ${mensajeDeError(e)}`)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  // Los mensajes nuevos llegan por el socket, también los propios; cada mensaje se muestra una sola vez
  useEffect(() => {
    return escucharMensajes(viajeId, tokenSesion, (mensaje) => {
      setMensajes((previos) => (previos.some((m) => m.id === mensaje.id) ? previos : [...previos, mensaje]))
    })
  }, [viajeId, tokenSesion])

  // Al llegar un mensaje nuevo se baja al final de la conversación
  useEffect(() => {
    finRef.current?.scrollIntoView?.({ behavior: "smooth" })
  }, [mensajes.length])

  const cargarAnteriores = async () => {
    const primero = mensajes[0]
    if (!primero) return
    try {
      const { mensajes: anteriores } = await listarMensajes(viajeId, tokenSesion, primero.creado_en)
      setMensajes((previos) => [...anteriores.filter((a) => !previos.some((p) => p.id === a.id)), ...previos])
      setHayAnteriores(anteriores.length === MENSAJES_POR_PAGINA)
    } catch (e) {
      setError(`No se han podido cargar los mensajes anteriores: ${mensajeDeError(e)}`)
    }
  }

  const activo = viaje?.estado === "activo"

  const handleEnviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const recortado = texto.trim()
    if (recortado === "" || enviando || !activo) return
    setEnviando(true)
    setErrorEnvio("")
    try {
      const mensaje = await enviarMensaje(viajeId, recortado, tokenSesion)
      setMensajes((previos) => (previos.some((m) => m.id === mensaje.id) ? previos : [...previos, mensaje]))
      setTexto("")
    } catch (e) {
      setErrorEnvio(mensajeDeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: ALTO_BARRA_INFERIOR + 88 }}>
        {/* Cabecera y pestañas: Chat (esta pantalla) y Galería */}
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 16px", borderRadius: RADIUS.header }}>
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver al viaje"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(255,255,255,0.6)", fontFamily: NUNITO, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}
          >
            ← Viaje
          </button>
          <Heading size={22} color="white">
            Chat del grupo
          </Heading>
          <div role="tablist" aria-label="Chat y galería" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              role="tab"
              aria-selected="true"
              style={{ background: "white", color: C.navy, border: "none", borderRadius: RADIUS.md, padding: "7px 14px", fontFamily: NUNITO, fontWeight: 800, fontSize: 12, cursor: "default" }}
            >
              Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="false"
              onClick={onAbrirGaleria}
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: RADIUS.md, padding: "7px 14px", fontFamily: NUNITO, fontWeight: 800, fontSize: 12, cursor: "pointer" }}
            >
              Galería
            </button>
          </div>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {error && (
            <div role="alert" style={estiloAlerta}>
              {error}
            </div>
          )}

          {cargando && <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center" }}>Cargando mensajes...</p>}

          {viaje && !activo && (
            <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, textAlign: "center", margin: 0 }}>
              El viaje está finalizado: el chat es de solo lectura.
            </p>
          )}

          {hayAnteriores && (
            <button
              type="button"
              onClick={cargarAnteriores}
              style={{ alignSelf: "center", background: "white", border: `1.5px solid ${C.border}`, borderRadius: RADIUS.md, padding: "6px 12px", fontFamily: NUNITO, fontWeight: 700, fontSize: 12, color: C.navy, cursor: "pointer" }}
            >
              Cargar mensajes anteriores
            </button>
          )}

          {!cargando && mensajes.length === 0 && !error && (
            <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center" }}>
              Todavía no hay mensajes. ¡Escribe el primero!
            </p>
          )}

          <ul aria-label="Mensajes" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {mensajes.map((mensaje) => {
              const propio = mensaje.autor.usuario_id === usuarioId
              return (
                <li key={mensaje.id} style={{ display: "flex", flexDirection: "column", alignItems: propio ? "flex-end" : "flex-start", gap: 2 }}>
                  {!propio && (
                    <span style={{ fontFamily: NUNITO, fontSize: 11, fontWeight: 700, color: C.muted }}>
                      {mensaje.autor.nombre ?? "Antiguo miembro"}
                    </span>
                  )}
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "8px 12px",
                      borderRadius: 14,
                      background: propio ? C.blue : "white",
                      color: propio ? "white" : C.navy,
                      border: propio ? "none" : `1.5px solid ${C.border}`,
                      fontFamily: NUNITO,
                      fontSize: 14,
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {mensaje.texto}
                  </div>
                  <span style={{ fontFamily: NUNITO, fontSize: 10, color: C.muted }}>{hora(mensaje.creado_en)}</span>
                </li>
              )
            })}
          </ul>
          <div ref={finRef} />
        </div>
      </div>

      {/* Campo para escribir, anclado sobre la barra inferior */}
      <div
        style={{ position: "fixed", left: 0, right: 0, bottom: ALTO_BARRA_INFERIOR, zIndex: 20, background: C.bg, borderTop: `1px solid ${C.border}` }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "10px 16px" }}>
          {errorEnvio && (
            <div role="alert" style={{ ...estiloAlerta, marginBottom: 8 }}>
              {errorEnvio}
            </div>
          )}
          <form aria-label="Escribir mensaje" onSubmit={handleEnviar} style={{ display: "flex", gap: 8, boxShadow: SHADOWS.card }}>
            <input
              aria-label="Mensaje"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={MAX_TEXTO}
              disabled={!activo || enviando}
              placeholder={activo ? "Escribe un mensaje" : "El viaje está finalizado"}
              style={{ flex: 1, minWidth: 0, border: `1.5px solid ${C.border}`, borderRadius: RADIUS.md, padding: "10px 12px", fontFamily: NUNITO, fontSize: 14, background: "white" }}
            />
            <button
              type="submit"
              disabled={!activo || enviando || texto.trim() === ""}
              style={{ background: C.blue, color: "white", border: "none", borderRadius: RADIUS.md, padding: "0 16px", fontFamily: NUNITO, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
            >
              {enviando ? "Enviando..." : "Enviar"}
            </button>
          </form>
        </div>
      </div>

      <BarraInferior activa="mas" onCambiar={onCambiarSeccion} />
    </div>
  )
}
