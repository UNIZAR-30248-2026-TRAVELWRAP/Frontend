import { useEffect, useState, type FormEvent } from "react"
import { ApiError } from "../services/authApi"
import { guardarPlaylist, obtenerPlaylist, quitarPlaylist, type PlaylistViaje } from "../services/playlistApi"
import { C, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { urlEmbebida } from "../utils/playlistEmbebida"
import Icon from "./Icon"

type TarjetaPlaylistProps = {
  viajeId: string
  tokenSesion: string
  // Con el viaje activo cualquier miembro puede enlazar, cambiar o quitar la playlist
  activo: boolean
}

const mensajeDeError = (e: unknown, porDefecto: string) => (e instanceof ApiError ? e.message : porDefecto)

// Botón redondo solo con icono (con nombre accesible)
const botonIcono = (color: string, fondo: string) =>
  ({
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "none",
    background: fondo,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
  }) as const

// Playlist compartida del viaje, en el inicio: el reproductor de Spotify y, con el viaje activo, un icono para cambiarla
export default function TarjetaPlaylist({ viajeId, tokenSesion, activo }: TarjetaPlaylistProps) {
  const [cargando, setCargando] = useState(true)
  const [playlist, setPlaylist] = useState<PlaylistViaje | null>(null)
  const [editando, setEditando] = useState(false)
  const [enlace, setEnlace] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let vigente = true
    obtenerPlaylist(viajeId, tokenSesion)
      .then((respuesta) => {
        if (vigente) setPlaylist(respuesta.playlist)
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e, "No se ha podido cargar la playlist del viaje"))
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enlace.trim() === "") {
      setError("Pega el enlace de la playlist de Spotify")
      return
    }
    setError("")
    setEnviando(true)
    try {
      const respuesta = await guardarPlaylist(viajeId, enlace.trim(), tokenSesion)
      setPlaylist(respuesta.playlist)
      setEditando(false)
      setEnlace("")
    } catch (e) {
      setError(mensajeDeError(e, "No se ha podido guardar la playlist"))
    } finally {
      setEnviando(false)
    }
  }

  const quitar = async () => {
    setError("")
    try {
      await quitarPlaylist(viajeId, tokenSesion)
      setPlaylist(null)
      setEditando(false)
    } catch (e) {
      setError(mensajeDeError(e, "No se ha podido quitar la playlist"))
    }
  }

  const empezarACambiar = () => {
    setEnlace(playlist?.url ?? "")
    setEditando(true)
    setError("")
  }

  // La fila de edición se ve al enlazar una playlist por primera vez o al cambiarla
  const mostrarEdicion = activo && (editando || !playlist)
  const reproductor = playlist ? urlEmbebida(playlist.url) : null

  return (
    <section
      aria-label="Playlist del viaje"
      style={{
        background: C.card,
        borderRadius: RADIUS.lg,
        padding: 10,
        boxShadow: SHADOWS.cardSoft,
        border: `1px solid ${C.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: NUNITO, fontWeight: 800, color: C.navy, fontSize: 13 }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          Playlist del viaje
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {playlist && (
            <a
              href={playlist.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir la playlist del viaje en Spotify"
              style={{ fontFamily: NUNITO, fontSize: 12, fontWeight: 800, color: C.green, textDecoration: "none" }}
            >
              Abrir ↗
            </a>
          )}
          {activo && playlist && !editando && (
            <button type="button" onClick={empezarACambiar} aria-label="Cambiar playlist" style={botonIcono(C.blue, C.lightBlue)}>
              <Icon name="edit" size={14} color={C.blue} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <p style={{ margin: 0, fontFamily: NUNITO, color: C.muted, fontSize: 12 }}>Cargando la playlist...</p>
      ) : reproductor && !editando ? (
        <iframe
          title="Reproductor de la playlist del viaje"
          src={reproductor}
          width="100%"
          height="80"
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          style={{ border: "none", borderRadius: 12, display: "block" }}
        />
      ) : !playlist && !activo ? (
        <p style={{ margin: 0, fontFamily: NUNITO, color: C.muted, fontSize: 12 }}>Este viaje no tiene playlist.</p>
      ) : mostrarEdicion ? (
        <form onSubmit={guardar} noValidate>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="url"
              value={enlace}
              onChange={(evento) => setEnlace(evento.target.value)}
              placeholder="Pega el enlace de Spotify"
              aria-label="Enlace de la playlist de Spotify"
              style={{
                flex: 1,
                minWidth: 0,
                height: 34,
                borderRadius: 17,
                border: `1px solid ${C.border}`,
                padding: "0 12px",
                fontFamily: NUNITO,
                fontSize: 13,
                background: C.bg,
              }}
            />
            {editando && (
              <button type="button" onClick={() => setEditando(false)} aria-label="Cancelar" style={botonIcono(C.muted, C.bg)}>
                <Icon name="close" size={14} color={C.muted} strokeWidth={2.2} />
              </button>
            )}
            <button
              type="submit"
              disabled={enviando}
              aria-label={enviando ? "Guardando playlist" : "Guardar playlist"}
              style={{ ...botonIcono("white", C.blue), cursor: enviando ? "wait" : "pointer" }}
            >
              <Icon name="check" size={15} color="white" strokeWidth={2.5} />
            </button>
          </div>
          {editando && (
            <button
              type="button"
              onClick={() => void quitar()}
              aria-label="Quitar playlist"
              style={{ marginTop: 6, border: "none", background: "transparent", color: C.red, fontFamily: NUNITO, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}
            >
              Quitar playlist
            </button>
          )}
        </form>
      ) : null}

      {error && (
        <p role="alert" style={{ margin: "8px 0 0", fontFamily: NUNITO, fontSize: 12, fontWeight: 700, color: C.red }}>
          {error}
        </p>
      )}
    </section>
  )
}
