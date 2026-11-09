import { useEffect, useRef, useState, type ChangeEvent } from "react"
import AvatarStack from "../components/AvatarStack"
import BarraInferior, { ALTO_BARRA_INFERIOR, type SeccionViaje } from "../components/BarraInferior"
import BotonVolver from "../components/BotonVolver"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import VisorFotos from "../components/VisorFotos"
import { ApiError } from "../services/authApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { estiloAlerta } from "../styles/formulario"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import { motivoParaNoSubirFoto, textoDeFotos, TIPOS_FOTO } from "../utils/galeria"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

type Pestana = "chat" | "galeria"

type Foto = { id: string; url: string; nombre: string }

const PESTANAS: { id: Pestana; icono: string; texto: string; disponible: boolean }[] = [
  { id: "chat", icono: "chat", texto: "Chat", disponible: false },
  { id: "galeria", icono: "gallery", texto: "Galería", disponible: true },
]

type ChatGaleriaProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  onCambiarSeccion?: (seccion: SeccionViaje) => void
}

export default function ChatGaleria({ viajeId, tokenSesion, onVolver, onCambiarSeccion }: ChatGaleriaProps) {
  const [pestana, setPestana] = useState<Pestana>("galeria")
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [fotos, setFotos] = useState<Foto[]>([])
  const [errorSubida, setErrorSubida] = useState("")
  const selectorFoto = useRef<HTMLInputElement>(null)
  const urlsCreadas = useRef<string[]>([])
  const [fotoAbierta, setFotoAbierta] = useState<number | null>(null)
  const miniaturas = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    let vigente = true
    obtenerViaje(viajeId, tokenSesion)
      .then((datos) => {
        if (vigente) setViaje(datos)
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

  useEffect(
    () => () => {
      urlsCreadas.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  const miembros = (viaje?.miembros ?? []).map((m, indice) => aMiembro(m.nombre, indice))
  const activo = viaje?.estado === "activo"

  const cerrarVisor = () => {
    const cerrada = fotoAbierta
    setFotoAbierta(null)
    if (cerrada !== null) setTimeout(() => miniaturas.current[cerrada]?.focus(), 0)
  }

  const handleFotoElegida = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0]
    evento.target.value = ""
    if (!archivo) return
    const motivo = motivoParaNoSubirFoto(archivo)
    if (motivo) {
      setErrorSubida(motivo)
      return
    }
    setErrorSubida("")
    const url = URL.createObjectURL(archivo)
    urlsCreadas.current.push(url)
    setFotos((anteriores) => [{ id: url, url, nombre: archivo.name }, ...anteriores])
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
                  onClick={() => setPestana(id)}
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
                      accept={TIPOS_FOTO.join(",")}
                      aria-label="Elegir la foto que se va a subir"
                      onChange={handleFotoElegida}
                      hidden
                    />
                    <button
                      type="button"
                      onClick={() => selectorFoto.current?.click()}
                      style={{
                        background: C.blue,
                        color: "white",
                        border: "none",
                        borderRadius: 10,
                        minHeight: 44,
                        padding: "6px 14px",
                        fontFamily: NUNITO,
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        boxShadow: SHADOWS.button,
                      }}
                    >
                      <Icon name="plus" size={14} color="white" strokeWidth={2.5} />
                      Subir
                    </button>
                  </>
                )}
              </div>

              {!activo && (
                <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, margin: "0 0 16px" }}>
                  El viaje está finalizado: se pueden ver las fotos, pero ya no se pueden subir.
                </p>
              )}

              {errorSubida && (
                <div role="alert" style={{ ...estiloAlerta, marginBottom: 16 }}>
                  {errorSubida}
                </div>
              )}

              {fotos.length === 0 ? (
                <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                  Aún no hay fotos en la galería del viaje.
                </p>
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
                        aria-label={`Ampliar ${foto.nombre}`}
                        style={{ width: "100%", height: "100%", padding: 0, border: "none", background: "none", cursor: "zoom-in", display: "block" }}
                      >
                        <img
                          src={foto.url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12 }}>
                  {textoDeFotos(fotos.length, miembros.length)}
                </span>
                <AvatarStack members={miembros} size={22} />
              </div>
            </>
          )}
        </div>
      </div>

      {fotoAbierta !== null && (
        <VisorFotos fotos={fotos} indice={fotoAbierta} onCambiar={setFotoAbierta} onCerrar={cerrarVisor} />
      )}

      <BarraInferior activa="mas" onCambiar={onCambiarSeccion} />
    </div>
  )
}
