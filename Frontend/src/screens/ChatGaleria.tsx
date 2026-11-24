import { useEffect, useRef, useState, type ChangeEvent } from "react"
import AvatarStack from "../components/AvatarStack"
import BarraInferior, { ALTO_BARRA_INFERIOR, type SeccionViaje } from "../components/BarraInferior"
import BotonVolver from "../components/BotonVolver"
import DialogoConfirmacion from "../components/DialogoConfirmacion"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import VisorFotos from "../components/VisorFotos"
import { ApiError } from "../services/authApi"
import { borrarFoto, listarFotos, subirFoto, type Almacenamiento, type Foto } from "../services/fotosApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { viajeEnCache } from "../services/viajesEnCache"
import { estiloAlerta } from "../styles/formulario"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import { compartirArchivo } from "../utils/compartir"
import { archivoEsVideo, descripcionDeFoto, esVideo, motivoParaNoSubirFoto, textoDeEspacio, textoDeFotos, TIPOS_ARCHIVO } from "../utils/galeria"
import EstadoVacio from "../components/EstadoVacio"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

type Pestana = "chat" | "galeria"

type FotoVisible = Foto & { url: string }

const conUrl = (foto: Foto): foto is FotoVisible => foto.url !== null

const PESTANAS: { id: Pestana; icono: string; texto: string; disponible: boolean }[] = [
  { id: "chat", icono: "chat", texto: "Chat", disponible: true },
  { id: "galeria", icono: "gallery", texto: "Galería", disponible: true },
]

type ChatGaleriaProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  onCambiarSeccion?: (seccion: SeccionViaje) => void
  // Pestaña Chat: abre la pantalla de chat del grupo
  onAbrirChat?: () => void
}

export default function ChatGaleria({ viajeId, tokenSesion, onVolver, onCambiarSeccion, onAbrirChat }: ChatGaleriaProps) {
  const [pestana, setPestana] = useState<Pestana>("galeria")
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(() => viajeEnCache(viajeId))
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [fotos, setFotos] = useState<FotoVisible[]>([])
  const [errorSubida, setErrorSubida] = useState("")
  const selectorFoto = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 })
  const [fotoAbierta, setFotoAbierta] = useState<number | null>(null)
  const [almacenamiento, setAlmacenamiento] = useState<Almacenamiento | null>(null)
  const [aBorrar, setABorrar] = useState<FotoVisible | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [errorBorrar, setErrorBorrar] = useState("")
  const [compartiendo, setCompartiendo] = useState(false)
  const [avisoVisor, setAvisoVisor] = useState<{ tipo: "info" | "error"; texto: string } | null>(null)
  const miniaturas = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    let vigente = true
    Promise.all([obtenerViaje(viajeId, tokenSesion), listarFotos(viajeId, tokenSesion)])
      .then(([datosViaje, lista]) => {
        if (!vigente) return
        setViaje(datosViaje)
        setFotos(lista.fotos.filter(conUrl))
        setAlmacenamiento(lista.almacenamiento ?? null)
      })
      .catch((e) => {
        if (vigente) setError(`No se ha podido cargar la galería: ${mensajeDeError(e)}`)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  const miembros = (viaje?.miembros ?? []).map((m, indice) => aMiembro(m.nombre, indice, m.avatar_url))
  const activo = viaje?.estado === "activo"
  const fotosDelVisor = fotos.map((foto) => ({
    id: foto.id,
    url: foto.url,
    nombre: foto.nombre,
    descripcion: descripcionDeFoto(foto.subido_por, foto.creado_en, viaje?.miembros ?? []),
    esVideo: esVideo(foto.tipo_mime),
  }))
  const numeroDeVideos = fotos.filter((foto) => esVideo(foto.tipo_mime)).length

  const cambiarFotoDelVisor = (indice: number) => {
    setAvisoVisor(null)
    setFotoAbierta(indice)
  }

  const cerrarVisor = () => {
    const cerrada = fotoAbierta
    setFotoAbierta(null)
    setAvisoVisor(null)
    if (cerrada !== null) setTimeout(() => miniaturas.current[cerrada]?.focus(), 0)
  }

  const handleCompartir = async () => {
    const foto = fotoAbierta === null ? null : fotos[fotoAbierta]
    if (!foto || compartiendo) return
    setCompartiendo(true)
    setAvisoVisor(null)
    try {
      const resultado = await compartirArchivo(foto.url, foto.nombre, foto.tipo_mime)
      if (resultado === "descargado") {
        setAvisoVisor({
          tipo: "info",
          texto: "Tu dispositivo no permite compartir archivos desde el navegador, así que se ha descargado para que lo envíes tú.",
        })
      }
    } catch (e) {
      setAvisoVisor({ tipo: "error", texto: e instanceof Error ? e.message : "No se ha podido compartir" })
    } finally {
      setCompartiendo(false)
    }
  }

  const abrirBorrado = () => {
    if (fotoAbierta === null) return
    setErrorBorrar("")
    setABorrar(fotos[fotoAbierta] ?? null)
  }

  const handleBorrar = async () => {
    if (!aBorrar) return
    setBorrando(true)
    setErrorBorrar("")
    try {
      await borrarFoto(viajeId, aBorrar.id, tokenSesion)
      const restantes = fotos.filter((foto) => foto.id !== aBorrar.id)
      setFotos(restantes)
      setAlmacenamiento((actual) => (actual ? { ...actual, usado_bytes: Math.max(actual.usado_bytes - aBorrar.tamano_bytes, 0) } : actual))
      setFotoAbierta(restantes.length === 0 ? null : Math.min(fotoAbierta ?? 0, restantes.length - 1))
      setABorrar(null)
    } catch (e) {
      setErrorBorrar(`No se ha podido borrar: ${mensajeDeError(e)}`)
    } finally {
      setBorrando(false)
    }
  }

  const handleFotoElegida = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(evento.target.files ?? [])
    evento.target.value = ""
    if (archivos.length === 0) return
    setErrorSubida("")
    setSubiendo(true)
    const fallos: { nombre: string; motivo: string }[] = []
    try {
      for (const [indice, archivo] of archivos.entries()) {
        setProgreso({ hechas: indice, total: archivos.length })
        const motivo = motivoParaNoSubirFoto(archivo)
        if (motivo) {
          fallos.push({ nombre: archivo.name, motivo })
          continue
        }
        try {
          const foto = await subirFoto(viajeId, archivo, tokenSesion)
          if (conUrl(foto)) setFotos((anteriores) => [foto, ...anteriores])
          setAlmacenamiento((actual) => (actual ? { ...actual, usado_bytes: actual.usado_bytes + foto.tamano_bytes } : actual))
        } catch (e) {
          fallos.push({ nombre: archivo.name, motivo: mensajeDeError(e) })
        }
      }
    } finally {
      setSubiendo(false)
    }
    if (fallos.length === 0) return
    if (archivos.length === 1) {
      const [{ motivo }] = fallos
      setErrorSubida(motivoParaNoSubirFoto(archivos[0]) ? motivo : `No se ha podido subir ${archivoEsVideo(archivos[0]) ? "el vídeo" : "la foto"}: ${motivo}`)
      return
    }
    const detalle = fallos.map((fallo) => `${fallo.nombre} (${fallo.motivo})`).join("; ")
    const nombreDelConjunto = archivos.some(archivoEsVideo) ? "archivos" : "fotos"
    setErrorSubida(`No se han podido subir ${fallos.length} de ${archivos.length} ${nombreDelConjunto}: ${detalle}`)
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: ALTO_BARRA_INFERIOR + 24 }}>
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 20px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <BotonVolver onClick={onVolver} />
            <div style={{ minWidth: 0 }}>
              {viaje && (
                <SectionLabel>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {viaje.nombre}
                  </span>
                </SectionLabel>
              )}
              <Heading size={22} color="white">
                Chat y Galería
              </Heading>
            </div>
          </div>
          <div
            role="tablist"
            aria-label="Chat y Galería"
            style={{ display: "flex", background: "rgba(255,255,255,0.14)", borderRadius: 12, padding: 4, gap: 3 }}
          >
            {PESTANAS.map(({ id, icono, texto, disponible }) => {
              const seleccionada = pestana === id
              return (
                <button
                  type="button"
                  role="tab"
                  key={id}
                  aria-selected={seleccionada}
                  disabled={!disponible}
                  title={disponible ? undefined : "Disponible próximamente"}
                  onClick={() => (id === "chat" ? onAbrirChat?.() : setPestana(id))}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    background: seleccionada ? "white" : "transparent",
                    color: seleccionada ? C.blue : "rgba(255,255,255,0.75)",
                    border: "none",
                    borderRadius: 9,
                    padding: "8px 4px",
                    fontFamily: NUNITO,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: disponible ? "pointer" : "not-allowed",
                    opacity: disponible ? 1 : 0.55,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                  }}
                >
                  <Icon name={icono} size={14} color={seleccionada ? C.blue : "rgba(255,255,255,0.75)"} strokeWidth={2} />
                  {texto}
                </button>
              )
            })}
          </div>
        </div>

        <div role="tabpanel" aria-label="Galería" style={{ padding: "20px 16px 0" }}>
          {error && (
            <div role="alert" style={{ ...estiloAlerta, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {cargando && (
            <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center" }}>Cargando galería...</p>
          )}

          {viaje && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <SectionLabel>Fotos compartidas</SectionLabel>
                {activo && (
                  <>
                    <input
                      ref={selectorFoto}
                      type="file"
                      accept={TIPOS_ARCHIVO.join(",")}
                      aria-label="Elegir las fotos o vídeos que se van a subir"
                      multiple
                      onChange={handleFotoElegida}
                      hidden
                    />
                    <button
                      type="button"
                      onClick={() => selectorFoto.current?.click()}
                      disabled={subiendo}
                      style={{
                        background: C.blue,
                        color: "white",
                        border: "none",
                        borderRadius: RADIUS.md,
                        minHeight: 44,
                        padding: "10px 16px",
                        fontFamily: NUNITO,
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: subiendo ? "wait" : "pointer",
                        opacity: subiendo ? 0.7 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        boxShadow: SHADOWS.button,
                      }}
                    >
                      <Icon name="plus" size={14} color="white" strokeWidth={2.5} />
                      {subiendo ? (progreso.total > 1 ? `Subiendo ${progreso.hechas + 1} de ${progreso.total}...` : "Subiendo...") : "Subir"}
                    </button>
                  </>
                )}
              </div>

              {errorSubida && (
                <div role="alert" style={{ ...estiloAlerta, marginBottom: 16 }}>
                  {errorSubida}
                </div>
              )}

              {fotos.length === 0 ? (
                <EstadoVacio icono="gallery">Aún no hay fotos en la galería del viaje.</EstadoVacio>
              ) : (
                <ul
                  aria-label="Fotos del viaje"
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 4,
                    borderRadius: RADIUS.lg,
                    overflow: "hidden",
                  }}
                >
                  {fotos.map((foto, posicion) => (
                    <li key={foto.id} style={{ aspectRatio: "1", background: "#CBD5E0", overflow: "hidden" }}>
                      <button
                        type="button"
                        ref={(el) => {
                          miniaturas.current[posicion] = el
                        }}
                        onClick={() => setFotoAbierta(posicion)}
                        aria-label={`${esVideo(foto.tipo_mime) ? "Reproducir" : "Ampliar"} ${foto.nombre}`}
                        style={{ width: "100%", height: "100%", padding: 0, border: "none", background: "none", cursor: "zoom-in", display: "block", position: "relative" }}
                      >
                        {esVideo(foto.tipo_mime) ? (
                          <>
                            <video
                              src={`${foto.url}#t=0.1`}
                              preload="metadata"
                              muted
                              playsInline
                              aria-hidden="true"
                              tabIndex={-1}
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#1A202C", pointerEvents: "none" }}
                            />
                            <span
                              aria-hidden="true"
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: "rgba(13,31,60,0.62)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Icon name="play" size={16} color="white" strokeWidth={2} />
                            </span>
                          </>
                        ) : (
                          <img
                            src={foto.url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12 }}>
                  <div>{textoDeFotos(fotos.length - numeroDeVideos, miembros.length, numeroDeVideos)}</div>
                  {almacenamiento && <div>{textoDeEspacio(almacenamiento.usado_bytes, almacenamiento.limite_bytes)}</div>}
                </div>
                <AvatarStack members={miembros} size={22} />
              </div>
            </>
          )}
        </div>
      </div>

      {fotoAbierta !== null && (
        <VisorFotos
          fotos={fotosDelVisor}
          indice={fotoAbierta}
          onCambiar={cambiarFotoDelVisor}
          onCerrar={cerrarVisor}
          onBorrar={activo ? abrirBorrado : undefined}
          onCompartir={handleCompartir}
          compartiendo={compartiendo}
          aviso={avisoVisor}
        />
      )}

      {aBorrar && (
        <DialogoConfirmacion
          titulo={esVideo(aBorrar.tipo_mime) ? "¿Borrar este vídeo?" : "¿Borrar esta foto?"}
          icono="trash"
          color={C.red}
          colorFondo={C.redBg}
          textoConfirmar={esVideo(aBorrar.tipo_mime) ? "Borrar vídeo" : "Borrar foto"}
          textoConfirmando="Borrando..."
          ocupado={borrando}
          error={errorBorrar}
          onConfirmar={handleBorrar}
          onCancelar={() => setABorrar(null)}
          zIndex={70}
        >
          Se borrará <strong style={{ color: C.navy }}>{aBorrar.nombre}</strong> de la galería para todos los viajeros.
          Esta acción no se puede deshacer.
        </DialogoConfirmacion>
      )}

      <BarraInferior activa="mas" onCambiar={onCambiarSeccion} />
    </div>
  )
}
