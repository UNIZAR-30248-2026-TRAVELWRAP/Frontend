import { useEffect, useState, type CSSProperties, type FormEvent } from "react"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import { ApiError } from "../services/authApi"
import { editarViaje, obtenerViaje, type CambiosViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const inputStyle: CSSProperties = {
  width: "100%",
  background: "white",
  border: `1.5px solid ${C.border}`,
  borderRadius: RADIUS.md,
  padding: "13px 16px",
  fontFamily: NUNITO,
  fontSize: 14,
  color: C.navy,
  outline: "none",
  boxSizing: "border-box",
}

const labelStyle: CSSProperties = {
  fontFamily: NUNITO,
  fontSize: 11,
  fontWeight: 700,
  color: C.muted,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  marginBottom: 6,
  display: "block",
}

const alertaStyle: CSSProperties = {
  background: C.redBg,
  border: `1.5px solid ${C.red}55`,
  borderRadius: 12,
  padding: "10px 14px",
  color: C.red,
  fontFamily: NUNITO,
  fontSize: 13,
  fontWeight: 700,
}

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

// ─── Pantalla: Editar viaje ───────────────────────────────────────────────────
type EditarViajeProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  onGuardado?: (viaje: ViajeDelUsuario) => void
}

export default function EditarViaje({ viajeId, tokenSesion, onVolver, onGuardado }: EditarViajeProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [errorCarga, setErrorCarga] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

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

  const cambiar = (campo: keyof Formulario) => (valor: string) =>
    setFormulario((actual) => (actual ? { ...actual, [campo]: valor } : actual))

  const editable = viaje?.estado === "activo" && viaje.rol === "creador"

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
  const hayCambios = Object.keys(cambios).length > 0
  const canSubmit = editable && valido && hayCambios && !guardando

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setGuardando(true)
    setError("")
    try {
      const actualizado = await editarViaje(viajeId, cambios, tokenSesion)
      onGuardado?.(actualizado)
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Cabecera */}
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 24px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={onVolver}
              aria-label="Volver"
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "none",
                borderRadius: 12,
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Icon name="arrow_left" size={20} color="white" strokeWidth={2.5} />
            </button>
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
            <div role="alert" style={alertaStyle}>
              No se ha podido cargar el viaje: {errorCarga}
            </div>
          )}

          {viaje && !editable && (
            <div role="alert" style={alertaStyle}>
              {viaje.rol !== "creador"
                ? "Solo el creador del viaje puede editar sus datos"
                : "El viaje está cerrado y ya no se puede modificar"}
            </div>
          )}

          {formulario && viaje && editable && (
            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label htmlFor="editar-nombre" style={labelStyle}>
                  Nombre del viaje
                </label>
                <input
                  id="editar-nombre"
                  value={formulario.nombre}
                  onChange={(event) => cambiar("nombre")(event.target.value)}
                  placeholder="Ej. Escapada de primavera"
                  style={inputStyle}
                />
              </div>

              {viaje.destino !== null && (
                <div>
                  <label htmlFor="editar-destino" style={labelStyle}>
                    Destino
                  </label>
                  <input
                    id="editar-destino"
                    value={formulario.destino}
                    onChange={(event) => cambiar("destino")(event.target.value)}
                    placeholder="Ciudad o país"
                    style={inputStyle}
                  />
                </div>
              )}

              <div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="editar-fecha-inicio" style={labelStyle}>
                      Fecha de inicio
                    </label>
                    <input
                      id="editar-fecha-inicio"
                      type="date"
                      value={formulario.fechaInicio}
                      onChange={(event) => cambiar("fechaInicio")(event.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="editar-fecha-fin" style={labelStyle}>
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
                      style={inputStyle}
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
                <label htmlFor="editar-presupuesto" style={labelStyle}>
                  Presupuesto total (€)
                </label>
                <input
                  id="editar-presupuesto"
                  type="number"
                  min={0}
                  value={formulario.presupuesto}
                  onChange={(event) => cambiar("presupuesto")(event.target.value)}
                  placeholder="0"
                  style={inputStyle}
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
                  Los cambios se mostrarán a todos los viajeros en el inicio del viaje.
                </div>
              </div>

              {error && (
                <div role="alert" style={alertaStyle}>
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
