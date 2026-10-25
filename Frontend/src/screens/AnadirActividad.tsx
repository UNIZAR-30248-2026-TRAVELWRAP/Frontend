import { useEffect, useState, type CSSProperties, type FormEvent } from "react"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import { CATEGORIAS, crearActividad, type Categoria } from "../services/actividadesApi"
import { ApiError } from "../services/authApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { diasDelViaje } from "../utils/formatoViaje"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const inputStyle: CSSProperties = {
  width: "100%",
  background: "white",
  border: `1.5px solid ${C.border}`,
  borderRadius: 14,
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

type AnadirActividadProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  fechaInicial?: string
  onGuardada?: (fecha: string) => void
}

export default function AnadirActividad({ viajeId, tokenSesion, fechaInicial = "", onVolver, onGuardada }: AnadirActividadProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [errorCarga, setErrorCarga] = useState("")
  const [titulo, setTitulo] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [hora, setHora] = useState("")
  const [horaFin, setHoraFin] = useState("")
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [fecha, setFecha] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let vigente = true
    obtenerViaje(viajeId, tokenSesion)
      .then((datos) => {
        if (!vigente) return
        setViaje(datos)
        if (datos.fecha_inicio && datos.fecha_fin) {
          const enElViaje = diasDelViaje(datos.fecha_inicio, datos.fecha_fin).some((d) => d.fecha === fechaInicial)
          setFecha(enElViaje ? fechaInicial : datos.fecha_inicio)
        } else {
          setFecha(fechaInicial)
        }
      })
      .catch((e) => {
        if (vigente) setErrorCarga(mensajeDeError(e))
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion, fechaInicial])

  const dias = viaje?.fecha_inicio && viaje.fecha_fin ? diasDelViaje(viaje.fecha_inicio, viaje.fecha_fin) : []
  const editable = viaje?.estado === "activo"
  const avisoHoras =
    hora !== "" && horaFin !== "" && horaFin < hora ? "La hora de fin no puede ser anterior a la de inicio" : ""
  const canSubmit = editable && titulo.trim() !== "" && fecha !== "" && avisoHoras === "" && !guardando

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setGuardando(true)
    setError("")
    try {
      await crearActividad(
        viajeId,
        {
          titulo: titulo.trim(),
          fecha,
          hora_inicio: hora || null,
          hora_fin: hora ? horaFin || null : null,
          ubicacion_nombre: ubicacion.trim() || null,
          categoria,
        },
        tokenSesion,
      )
      onGuardada?.(fecha)
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 24px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: dias.length > 0 ? 16 : 0 }}>
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
                flexShrink: 0,
              }}
            >
              <Icon name="arrow_left" size={20} color="white" strokeWidth={2.5} />
            </button>
            <div style={{ minWidth: 0 }}>
              <SectionLabel>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>
                  Itinerario{viaje ? ` · ${viaje.nombre}` : ""}
                </span>
              </SectionLabel>
              <Heading size={22} color="white">
                Añadir Actividad
              </Heading>
            </div>
          </div>
          {dias.length > 0 && (
            <div role="group" aria-label="Día de la actividad" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {dias.map((dia) => {
                const activo = fecha === dia.fecha
                return (
                  <button
                    type="button"
                    key={dia.fecha}
                    aria-pressed={activo}
                    onClick={() => setFecha(dia.fecha)}
                    style={{
                      background: activo ? "white" : "rgba(255,255,255,0.18)",
                      color: activo ? C.blue : "rgba(255,255,255,0.85)",
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 16px",
                      fontFamily: NUNITO,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    {dia.texto}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ padding: "20px 16px 32px" }}>
          {errorCarga && (
            <div role="alert" style={alertaStyle}>
              No se ha podido cargar el viaje: {errorCarga}
            </div>
          )}

          {viaje && !editable && (
            <div role="alert" style={alertaStyle}>
              El viaje está cerrado y ya no se pueden añadir actividades
            </div>
          )}

          {viaje && editable && (
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="actividad-titulo" style={labelStyle}>
                  Nombre de la actividad
                </label>
                <input
                  id="actividad-titulo"
                  value={titulo}
                  maxLength={200}
                  onChange={(event) => setTitulo(event.target.value)}
                  placeholder="Ej. Visita al Coliseo"
                  style={inputStyle}
                />
              </div>

              {dias.length === 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="actividad-fecha" style={labelStyle}>
                    Fecha
                  </label>
                  <input
                    id="actividad-fecha"
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="actividad-lugar" style={labelStyle}>
                  Lugar / Dirección
                </label>
                <input
                  id="actividad-lugar"
                  value={ubicacion}
                  onChange={(event) => setUbicacion(event.target.value)}
                  placeholder="Ej. Piazza del Colosseo"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: avisoHoras ? 6 : 24 }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="actividad-hora" style={labelStyle}>
                    Hora
                  </label>
                  <input
                    id="actividad-hora"
                    type="time"
                    value={hora}
                    onChange={(event) => setHora(event.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="actividad-hora-fin" style={labelStyle}>
                    Hasta (opcional)
                  </label>
                  <input
                    id="actividad-hora-fin"
                    type="time"
                    value={hora ? horaFin : ""}
                    disabled={hora === ""}
                    min={hora || undefined}
                    onChange={(event) => setHoraFin(event.target.value)}
                    aria-invalid={avisoHoras !== ""}
                    aria-describedby={avisoHoras ? "actividad-horas-aviso" : undefined}
                    style={{ ...inputStyle, opacity: hora === "" ? 0.6 : 1 }}
                  />
                </div>
              </div>
              {avisoHoras && (
                <div
                  id="actividad-horas-aviso"
                  role="alert"
                  style={{ fontFamily: NUNITO, color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 24 }}
                >
                  {avisoHoras}
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <span id="actividad-tipo" style={labelStyle}>
                  Tipo (opcional)
                </span>
                <div role="group" aria-labelledby="actividad-tipo" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CATEGORIAS.map(({ valor, texto, icono }) => {
                    const elegida = categoria === valor
                    return (
                      <button
                        type="button"
                        key={valor}
                        aria-pressed={elegida}
                        onClick={() => setCategoria(elegida ? null : valor)}
                        style={{
                          background: elegida ? C.lightBlue : "white",
                          color: elegida ? C.blue : C.navy,
                          border: `1.5px solid ${elegida ? C.blue : C.border}`,
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontFamily: NUNITO,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Icon name={icono} size={15} color={elegida ? C.blue : C.muted} strokeWidth={2} />
                        {texto}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div role="alert" style={{ ...alertaStyle, marginBottom: 16 }}>
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
                  borderRadius: 16,
                  padding: 15,
                  fontFamily: NUNITO,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  opacity: canSubmit ? 1 : 0.6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: SHADOWS.button,
                }}
              >
                <Icon name="plus" size={18} color="white" strokeWidth={2.5} />
                {guardando ? "Guardando..." : "Añadir al itinerario"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
