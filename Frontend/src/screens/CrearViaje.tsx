import { useState, type CSSProperties, type FormEvent } from "react"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import { ApiError } from "../services/authApi"
import { crearViaje, type Viaje } from "../services/viajesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { sugerirNombreViaje } from "../utils/formatoViaje"

type ModoDestino = "votar" | "elegido"

// Con «Votar destino» el viaje se crea sin destino y se decide después por votación
const MODOS_DESTINO: { modo: ModoDestino; texto: string; icono: string }[] = [
  { modo: "votar", texto: "Votar destino", icono: "vote" },
  { modo: "elegido", texto: "Destino ya elegido", icono: "pin" },
]

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

// ─── Pantalla: Nuevo viaje ────────────────────────────────────────────────────
type CrearViajeProps = {
  tokenSesion: string
  onBack?: () => void
  onCreated?: (viaje: Viaje) => void
}

export default function CrearViaje({ tokenSesion, onBack, onCreated }: CrearViajeProps) {
  const [nombre, setNombre] = useState("")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [presupuesto, setPresupuesto] = useState("")
  const [modoDestino, setModoDestino] = useState<ModoDestino>("elegido")
  const [destino, setDestino] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")

  // Las fechas en formato AAAA-MM-DD se pueden comparar como texto
  const avisoFechas =
    fechaInicio !== "" && fechaFin !== "" && fechaFin < fechaInicio
      ? "La fecha de fin no puede ser anterior a la de inicio"
      : ""

  const destinoElegido = modoDestino === "elegido" ? destino : ""
  const nombreFinal = nombre.trim() || sugerirNombreViaje(destinoElegido, fechaInicio, fechaFin)

  const presupuestoValido = presupuesto.trim() !== "" && Number(presupuesto) >= 0

  const canSubmit =
    nombreFinal !== "" &&
    avisoFechas === "" &&
    presupuestoValido &&
    (modoDestino === "votar" || destino.trim() !== "") &&
    !enviando

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setEnviando(true)
    setError("")
    try {
      const viaje = await crearViaje(
        {
          nombre: nombreFinal,
          presupuesto: Number(presupuesto),
          destino: modoDestino === "elegido" ? destino.trim() : null,
          fecha_inicio: fechaInicio || null,
          fecha_fin: fechaFin || null,
        },
        tokenSesion,
      )
      onCreated?.(viaje)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ha ocurrido un error")
      setEnviando(false)
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Cabecera */}
        <div
          style={{
            background: GRADIENTS.header,
            padding: "20px 20px 24px",
            borderRadius: RADIUS.header,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={onBack}
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
            <Heading size={22} color="white">
              Nuevo Viaje
            </Heading>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ padding: "20px 16px 32px" }}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="viaje-nombre" style={labelStyle}>
              Nombre del viaje
            </label>
            <input
              id="viaje-nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ej. Verano 2027"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: avisoFechas ? 6 : 16 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="viaje-fecha-inicio" style={labelStyle}>
                Fecha inicio
              </label>
              <input
                id="viaje-fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="viaje-fecha-fin" style={labelStyle}>
                Fecha fin
              </label>
              <input
                id="viaje-fecha-fin"
                type="date"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(event) => setFechaFin(event.target.value)}
                aria-invalid={avisoFechas !== ""}
                aria-describedby={avisoFechas ? "viaje-fechas-aviso" : undefined}
                style={inputStyle}
              />
            </div>
          </div>
          {avisoFechas && (
            <div
              id="viaje-fechas-aviso"
              role="alert"
              style={{
                fontFamily: NUNITO,
                color: C.red,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              {avisoFechas}
            </div>
          )}

          <div style={{ marginBottom: 22 }}>
            <label htmlFor="viaje-presupuesto" style={labelStyle}>
              Presupuesto estimado (€)
            </label>
            <input
              id="viaje-presupuesto"
              type="number"
              min={0}
              value={presupuesto}
              onChange={(event) => setPresupuesto(event.target.value)}
              placeholder="Ej. 850"
              style={inputStyle}
            />
          </div>

          {/* Destino */}
          <SectionLabel>Destino</SectionLabel>
          <div role="radiogroup" aria-label="Destino" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {MODOS_DESTINO.map(({ modo, texto, icono }) => {
              const activo = modoDestino === modo
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  key={modo}
                  onClick={() => setModoDestino(modo)}
                  style={{
                    flex: 1,
                    background: activo ? C.blue : "white",
                    color: activo ? "white" : C.navy,
                    border: `1.5px solid ${activo ? C.blue : C.border}`,
                    borderRadius: RADIUS.md,
                    padding: "12px 10px",
                    cursor: "pointer",
                    fontFamily: NUNITO,
                    fontWeight: 700,
                    fontSize: 13,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s",
                  }}
                >
                  <Icon name={icono} size={20} color={activo ? "white" : C.muted} strokeWidth={1.8} />
                  {texto}
                </button>
              )
            })}
          </div>
          {modoDestino === "elegido" && (
            <div style={{ marginBottom: 16 }}>
              <input
                aria-label="Ciudad o país de destino"
                value={destino}
                onChange={(event) => setDestino(event.target.value)}
                placeholder="Ciudad o país"
                style={inputStyle}
              />
            </div>
          )}

          {error && (
            <div
              role="alert"
              style={{
                background: C.redBg,
                border: `1.5px solid ${C.red}55`,
                borderRadius: 12,
                padding: "10px 14px",
                color: C.red,
                fontFamily: NUNITO,
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
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
              boxShadow: SHADOWS.button,
            }}
          >
            {enviando ? "Creando viaje..." : modoDestino === "elegido" ? "Crear viaje" : "Crear viaje y elegir destino"}
          </button>
        </form>
      </div>
    </div>
  )
}
