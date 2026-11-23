import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import FondoPortada from "../components/FondoPortada"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import { ApiError } from "../services/authApi"
import { editarViaje, obtenerViaje,quitarPortada,subirPortada, type CambiosViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { viajeEnCache } from "../services/viajesEnCache"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { ESTILO_CON_PORTADA } from "../styles/portada"
import BotonVolver from "../components/BotonVolver"
import { estiloAlerta, estiloCampo, estiloEtiqueta } from "../styles/formulario"
import { mensajeErrorPortada, prepararPortada, validarFotoPortada } from "../utils/portada"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

type Formulario = {
  nombre: string
  fechaInicio: string
  fechaFin: string
  presupuesto: string
  destino: string
}

const aFormulario = (viaje: ViajeDelUsuario): Formulario => ({
  nombre: viaje.nombre,
  fechaInicio: viaje.fecha_inicio ?? "",
  fechaFin: viaje.fecha_fin ?? "",
  presupuesto: String(viaje.presupuesto),
  destino: viaje.destino ?? "",
})

// Solo se envía lo que ha cambiado respecto al viaje guardado
const calcularCambios = (viaje: ViajeDelUsuario, f: Formulario): CambiosViaje => {
  const cambios: CambiosViaje = {}
  if (f.nombre.trim() !== viaje.nombre) cambios.nombre = f.nombre.trim()
  if ((f.fechaInicio || null) !== viaje.fecha_inicio) cambios.fecha_inicio = f.fechaInicio || null
  if ((f.fechaFin || null) !== viaje.fecha_fin) cambios.fecha_fin = f.fechaFin || null
  if (Number(f.presupuesto) !== Number(viaje.presupuesto)) cambios.presupuesto = Number(f.presupuesto)
  // Un viaje pendiente de votación no tiene destino aquí: se decide votando
  if (viaje.destino !== null && f.destino.trim() !== viaje.destino) cambios.destino = f.destino.trim()
  return cambios
}

// Foto elegida que todavía no se ha subido: se sube al guardar los cambios
type PortadaElegida = { archivo: File; vista: string }

const estiloBotonPortada = {
  border: "none",
  borderRadius: 12,
  minHeight: 36,
  padding: "9px 16px",
  fontFamily: NUNITO,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
} as const

// ─── Pantalla: Editar viaje ───────────────────────────────────────────────────
type EditarViajeProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  onGuardado?: (viaje: ViajeDelUsuario) => void
}

export default function EditarViaje({ viajeId, tokenSesion, onVolver, onGuardado }: EditarViajeProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(() => viajeEnCache(viajeId))
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [errorCarga, setErrorCarga] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")
  const [portadaElegida, setPortadaElegida] = useState<PortadaElegida | null>(null)
  const [quitarFoto, setQuitarFoto] = useState(false)
  const [errorPortada, setErrorPortada] = useState("")
  const selectorFoto = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let vigente = true
    obtenerViaje(viajeId, tokenSesion)
      .then((datos) => {
        if (!vigente) return
        setViaje(datos)
        setFormulario(aFormulario(datos))
      })
      .catch((e) => {
        if (vigente) setErrorCarga(mensajeDeError(e))
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  // La vista previa de la foto elegida se libera al cambiarla o al salir de la pantalla
  useEffect(() => {
    const vista = portadaElegida?.vista
    return () => {
      if (vista) URL.revokeObjectURL(vista)
    }
  }, [portadaElegida])

  const handleFotoElegida = (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0]
    // Se vacía para que volver a elegir la misma foto también dispare onChange
    event.target.value = ""
    if (!archivo) return
    const motivo = validarFotoPortada(archivo)
    if (motivo) {
      setErrorPortada(motivo)
      return
    }
    setErrorPortada("")
    setQuitarFoto(false)
    setPortadaElegida({ archivo, vista: URL.createObjectURL(archivo) })
  }

  const handleQuitarFoto = () => {
    setErrorPortada("")
    setPortadaElegida(null)
    setQuitarFoto(true)
  }

  const cambiar = (campo: keyof Formulario) => (valor: string) =>
    setFormulario((actual) => (actual ? { ...actual, [campo]: valor } : actual))

  // Cualquier miembro edita los datos y la portada del viaje, mientras está activo
  const editable = viaje?.estado === "activo"

  // Las fechas en formato AAAA-MM-DD se pueden comparar como texto
  const avisoFechas =
    formulario && formulario.fechaInicio !== "" && formulario.fechaFin !== "" && formulario.fechaFin < formulario.fechaInicio
      ? "La fecha de fin no puede ser anterior a la de inicio"
      : ""

  const valido =
    formulario !== null &&
    viaje !== null &&
    formulario.nombre.trim() !== "" &&
    formulario.presupuesto.trim() !== "" &&
    Number(formulario.presupuesto) >= 0 &&
    avisoFechas === "" &&
    (viaje.destino === null || formulario.destino.trim() !== "")

  const cambios = viaje && formulario ? calcularCambios(viaje, formulario) : {}
  const portadaActual = quitarFoto ? null : (portadaElegida?.vista ?? viaje?.portada_url ?? null)
  const cambiaPortada = portadaElegida !== null || (quitarFoto && Boolean(viaje?.portada_url))
  const hayCambios = Object.keys(cambios).length > 0 || cambiaPortada
  const canSubmit = editable && valido && hayCambios && !guardando

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setGuardando(true)
    setError("")
    try {
      let actualizado = viaje as ViajeDelUsuario
      if (Object.keys(cambios).length > 0) {
        actualizado = await editarViaje(viajeId, cambios, tokenSesion)
        setViaje(actualizado)
      }
      if (portadaElegida) {
        actualizado = await subirPortada(viajeId, await prepararPortada(portadaElegida.archivo), tokenSesion)
      } else if (quitarFoto && viaje?.portada_url) {
        actualizado = await quitarPortada(viajeId, tokenSesion)
      }
      onGuardado?.(actualizado)
    } catch (e) {
      setError(portadaElegida || quitarFoto ? mensajeErrorPortada(e) : mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Cabecera */}
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 24px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BotonVolver onClick={onVolver} />
            <div>
              <Heading size={22} color="white">
                Editar viaje
              </Heading>
              <div style={{ color: "rgba(255,255,255,0.65)", fontFamily: NUNITO, fontSize: 12, marginTop: 2 }}>
                Actualiza los datos principales
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "22px 16px 32px" }}>
          {errorCarga && (
            <div role="alert" style={estiloAlerta}>
              No se ha podido cargar el viaje: {errorCarga}
            </div>
          )}

          {viaje && !editable && (
            <div role="alert" style={estiloAlerta}>
              El viaje está finalizado y ya no se puede modificar
            </div>
          )}

          {formulario && viaje && editable && (
            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div id="editar-portada-etiqueta" style={estiloEtiqueta}>
                  Foto de portada
                </div>
                <div
                  role="group"
                  aria-labelledby="editar-portada-etiqueta"
                  style={{
                    ...ESTILO_CON_PORTADA,
                    background: portadaActual ? GRADIENTS.hero : `linear-gradient(145deg, ${C.lightBlue}, #DCEBFA)`,
                    border: portadaActual ? "none" : `1.5px dashed ${C.blue}66`,
                    borderRadius: RADIUS.lg,
                    minHeight: 150,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    textAlign: "center",
                  }}
                >
                  <FondoPortada url={portadaActual} />
                  {!portadaActual && (
                    <>
                      <span
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name="camera" size={22} color={C.blue} strokeWidth={2} />
                      </span>
                      <div style={{ fontFamily: NUNITO, fontSize: 14, fontWeight: 800, color: C.navy }}>
                        Añade una foto de portada
                      </div>
                      <div style={{ fontFamily: NUNITO, fontSize: 12, color: C.muted }}>
                        Se mostrará en Mis viajes y en el inicio del viaje
                      </div>
                    </>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => selectorFoto.current?.click()}
                      disabled={guardando}
                      style={{
                        ...estiloBotonPortada,
                        background: portadaActual ? "white" : C.blue,
                        color: portadaActual ? C.navy : "white",
                        opacity: guardando ? 0.6 : 1,
                      }}
                    >
                      <Icon name="camera" size={15} color={portadaActual ? C.navy : "white"} strokeWidth={2} />
                      {portadaActual ? "Cambiar foto" : "Seleccionar foto"}
                    </button>
                    {portadaActual && (
                      <button
                        type="button"
                        onClick={handleQuitarFoto}
                        disabled={guardando}
                        style={{ ...estiloBotonPortada, background: C.redBg, color: C.red, opacity: guardando ? 0.6 : 1 }}
                      >
                        Quitar foto
                      </button>
                    )}
                  </div>
                  <input
                    ref={selectorFoto}
                    type="file"
                    accept="image/jpeg,image/png"
                    hidden
                    aria-label="Elegir foto de portada"
                    onChange={handleFotoElegida}
                  />
                </div>
                {errorPortada && (
                  <div role="alert" style={{ ...estiloAlerta, marginTop: 8 }}>
                    {errorPortada}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="editar-nombre" style={estiloEtiqueta}>
                  Nombre del viaje
                </label>
                <input
                  id="editar-nombre"
                  value={formulario.nombre}
                  onChange={(event) => cambiar("nombre")(event.target.value)}
                  placeholder="Ej. Escapada de primavera"
                  style={estiloCampo}
                />
              </div>

              {viaje.destino !== null && (
                <div>
                  <label htmlFor="editar-destino" style={estiloEtiqueta}>
                    Destino
                  </label>
                  <input
                    id="editar-destino"
                    value={formulario.destino}
                    onChange={(event) => cambiar("destino")(event.target.value)}
                    placeholder="Ciudad o país"
                    style={estiloCampo}
                  />
                </div>
              )}

              <div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label htmlFor="editar-fecha-inicio" style={estiloEtiqueta}>
                      Fecha de inicio
                    </label>
                    <input
                      id="editar-fecha-inicio"
                      type="date"
                      value={formulario.fechaInicio}
                      onChange={(event) => cambiar("fechaInicio")(event.target.value)}
                      style={{ ...estiloCampo, padding: "13px 10px" }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label htmlFor="editar-fecha-fin" style={estiloEtiqueta}>
                      Fecha de fin
                    </label>
                    <input
                      id="editar-fecha-fin"
                      type="date"
                      value={formulario.fechaFin}
                      min={formulario.fechaInicio || undefined}
                      onChange={(event) => cambiar("fechaFin")(event.target.value)}
                      aria-invalid={avisoFechas !== ""}
                      aria-describedby={avisoFechas ? "editar-fechas-aviso" : undefined}
                      style={{ ...estiloCampo, padding: "13px 10px" }}
                    />
                  </div>
                </div>
                {avisoFechas && (
                  <div
                    id="editar-fechas-aviso"
                    role="alert"
                    style={{ fontFamily: NUNITO, color: C.red, fontSize: 12, fontWeight: 700, marginTop: 6 }}
                  >
                    {avisoFechas}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="editar-presupuesto" style={estiloEtiqueta}>
                  Presupuesto total (€)
                </label>
                <input
                  id="editar-presupuesto"
                  type="number"
                  min={0}
                  value={formulario.presupuesto}
                  onChange={(event) => cambiar("presupuesto")(event.target.value)}
                  placeholder="0"
                  style={estiloCampo}
                />
              </div>

              <div
                style={{
                  background: C.lightBlue,
                  borderRadius: 16,
                  padding: 14,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Icon name="settings" size={18} color={C.blue} strokeWidth={2} />
                <div style={{ fontFamily: NUNITO, fontSize: 12, lineHeight: 1.5, color: C.navy }}>
                  Los cambios se mostrarán a todos los viajeros en el inicio del viaje y en el resumen de presupuesto.
                </div>
              </div>

              {error && (
                <div role="alert" style={estiloAlerta}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  width: "100%",
                  background: C.blue,
                  color: "white",
                  border: "none",
                  borderRadius: 14,
                  padding: 14,
                  fontFamily: NUNITO,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  opacity: canSubmit ? 1 : 0.6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  boxShadow: SHADOWS.button,
                }}
              >
                <Icon name="check" size={17} color="white" strokeWidth={2.5} />
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
