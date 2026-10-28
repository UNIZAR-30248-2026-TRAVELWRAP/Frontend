import { useEffect, useState, type CSSProperties, type FormEvent } from "react"
import Avatar from "../components/Avatar"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import { ApiError } from "../services/authApi"
import { obtenerViaje, type MiembroDelViaje } from "../services/viajesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import { conEuros, leerImporte, repartirAPartesIguales } from "../utils/gastos"

export type CategoriaGasto = "comida" | "transporte" | "entradas" | "alojamiento" | "ocio" | "otros"

// Datos que espera POST /viajes/:viajeId/gastos
export type NuevoGasto = {
  concepto: string
  importe: number
  categoria: CategoriaGasto
  pagado_por: string
  participantes: string[]
}

const CATEGORIAS: { categoria: CategoriaGasto; icono: string; texto: string }[] = [
  { categoria: "comida", icono: "restaurant", texto: "Comida" },
  { categoria: "transporte", icono: "flight", texto: "Transporte" },
  { categoria: "entradas", icono: "ticket", texto: "Entradas" },
  { categoria: "alojamiento", icono: "house", texto: "Alojamiento" },
  { categoria: "ocio", icono: "gallery", texto: "Ocio" },
  { categoria: "otros", icono: "document", texto: "Otros" },
]

const MAX_CONCEPTO = 100

const inputStyle: CSSProperties = {
  width: "100%",
  background: "white",
  border: `1.5px solid ${C.border}`,
  borderRadius: RADIUS.md,
  padding: "13px 16px",
  fontFamily: NUNITO,
  fontSize: 16,
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

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

// Comprueba el formulario antes de enviarlo. Devuelve el motivo por el que no es válido, o "" si lo es
const validar = (importe: string, concepto: string, pagadoPor: string, participantes: string[]) => {
  if (leerImporte(importe) === null) return "Escribe un importe mayor que 0 con dos decimales como máximo"
  if (concepto.trim() === "") return "Escribe el concepto del gasto"
  if (!pagadoPor) return "Elige quién ha pagado"
  if (participantes.length === 0) return "Elige al menos un miembro entre los que dividir el gasto"
  return ""
}

// ─── Pantalla: Añadir gasto ───────────────────────────────────────────────────
type AnadirGastoProps = {
  viajeId: string
  tokenSesion: string
  // Usuario de la sesión: por defecto es quien ha pagado
  usuarioId: string
  onVolver?: () => void
  onRegistrar?: (gasto: NuevoGasto) => Promise<void>
}

export default function AnadirGasto({ viajeId, tokenSesion, usuarioId, onVolver, onRegistrar }: AnadirGastoProps) {
  const [miembros, setMiembros] = useState<MiembroDelViaje[]>([])
  const [cargando, setCargando] = useState(true)
  const [importe, setImporte] = useState("")
  const [concepto, setConcepto] = useState("")
  const [categoria, setCategoria] = useState<CategoriaGasto>("comida")
  const [pagadoPor, setPagadoPor] = useState("")
  const [participantes, setParticipantes] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")

  // Los miembros del viaje son los que pueden pagar y entre los que se divide. Por defecto paga quien
  // registra el gasto y se divide entre todos
  useEffect(() => {
    let vigente = true
    obtenerViaje(viajeId, tokenSesion)
      .then((viaje) => {
        if (!vigente) return
        const ids = viaje.miembros.map((m) => m.usuario_id)
        setMiembros(viaje.miembros)
        setPagadoPor(ids.includes(usuarioId) ? usuarioId : (ids[0] ?? ""))
        setParticipantes(ids)
      })
      .catch((e) => {
        if (vigente) setError(`No se ha podido cargar el viaje: ${mensajeDeError(e)}`)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion, usuarioId])

  // Se mantiene el orden de los miembros para que el reparto que se ve coincida con el que guarda el backend
  const alternarParticipante = (id: string) => {
    setParticipantes((lista) =>
      lista.includes(id) ? lista.filter((p) => p !== id) : miembros.map((m) => m.usuario_id).filter((p) => p === id || lista.includes(p)),
    )
    setError("")
  }

  const importeValido = leerImporte(importe)
  const partes = importeValido !== null && participantes.length > 0
    ? repartirAPartesIguales(importeValido, participantes.length)
    : []

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (enviando) return
    const motivo = validar(importe, concepto, pagadoPor, participantes)
    if (motivo) {
      setError(motivo)
      return
    }
    setEnviando(true)
    setError("")
    try {
      await onRegistrar?.({
        concepto: concepto.trim(),
        importe: importeValido as number,
        categoria,
        pagado_por: pagadoPor,
        participantes,
      })
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setEnviando(false)
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
                flexShrink: 0,
              }}
            >
              <Icon name="arrow_left" size={20} color="white" strokeWidth={2.5} />
            </button>
            <div>
              <div
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: NUNITO,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Control de Gastos
              </div>
              <Heading size={22} color="white">
                Añadir Gasto
              </Heading>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ padding: "20px 16px 32px" }}>
          {/* Importe destacado */}
          <div
            style={{
              background: "white",
              borderRadius: 20,
              padding: 20,
              textAlign: "center",
              marginBottom: 18,
              boxShadow: SHADOWS.cardRaised,
              border: `1.5px solid ${C.border}`,
            }}
          >
            <label htmlFor="gasto-importe" style={{ ...labelStyle, textAlign: "center" }}>
              Importe
            </label>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <span aria-hidden="true" style={{ fontFamily: NUNITO, fontSize: 40, fontWeight: 900, color: C.navy }}>
                €
              </span>
              <input
                id="gasto-importe"
                value={importe}
                onChange={(event) => {
                  setImporte(event.target.value)
                  setError("")
                }}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                style={{
                  fontFamily: NUNITO,
                  fontSize: 40,
                  fontWeight: 900,
                  color: C.navy,
                  border: "none",
                  outline: "none",
                  width: 170,
                  minWidth: 0,
                  background: "transparent",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="gasto-concepto" style={labelStyle}>
              Concepto
            </label>
            <input
              id="gasto-concepto"
              value={concepto}
              onChange={(event) => {
                setConcepto(event.target.value)
                setError("")
              }}
              maxLength={MAX_CONCEPTO}
              placeholder="Ej. Cena Trastevere"
              style={inputStyle}
            />
          </div>

          <SectionLabel>Categoría</SectionLabel>
          <div
            role="radiogroup"
            aria-label="Categoría"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}
          >
            {CATEGORIAS.map(({ categoria: valor, icono, texto }) => {
              const activa = categoria === valor
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={activa}
                  key={valor}
                  onClick={() => setCategoria(valor)}
                  style={{
                    background: activa ? C.lightBlue : "white",
                    border: `1.5px solid ${activa ? C.blue : C.border}`,
                    borderRadius: RADIUS.md,
                    padding: "12px 8px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s",
                  }}
                >
                  <Icon name={icono} size={20} color={activa ? C.blue : C.muted} strokeWidth={1.8} />
                  <span style={{ fontFamily: NUNITO, fontSize: 11, fontWeight: 700, color: activa ? C.blue : C.muted }}>
                    {texto}
                  </span>
                </button>
              )
            })}
          </div>

          {cargando && (
            <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, margin: "0 0 18px" }}>Cargando miembros...</p>
          )}

          {miembros.length > 0 && (
            <>
              <SectionLabel>Quién pagó</SectionLabel>
              <div role="radiogroup" aria-label="Quién pagó" style={{ display: "flex", gap: 8, marginBottom: 18, overflowX: "auto" }}>
                {miembros.map((m, i) => {
                  const activo = pagadoPor === m.usuario_id
                  const miembro = aMiembro(m.nombre, i)
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      key={m.usuario_id}
                      onClick={() => {
                        setPagadoPor(m.usuario_id)
                        setError("")
                      }}
                      style={{
                        flex: 1,
                        minWidth: 86,
                        background: activo ? C.lightBlue : "white",
                        border: `2px solid ${activo ? C.blue : C.border}`,
                        borderRadius: RADIUS.md,
                        padding: "12px 6px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.2s",
                      }}
                    >
                      <span aria-hidden="true">
                        <Avatar member={miembro} size={30} showBorder={false} />
                      </span>
                      <span style={{ fontFamily: NUNITO, fontSize: 11, fontWeight: 800, color: activo ? C.blue : C.navy }}>
                        {miembro.name}
                      </span>
                    </button>
                  )
                })}
              </div>

              <SectionLabel>Dividir entre</SectionLabel>
              <div
                role="group"
                aria-label="Dividir entre"
                style={{
                  background: "white",
                  borderRadius: RADIUS.lg,
                  overflow: "hidden",
                  boxShadow: SHADOWS.card,
                  border: `1.5px solid ${C.border}`,
                  marginBottom: 24,
                }}
              >
                {miembros.map((m, i) => {
                  const incluido = participantes.includes(m.usuario_id)
                  const parte = incluido ? partes[participantes.indexOf(m.usuario_id)] : undefined
                  const miembro = aMiembro(m.nombre, i)
                  return (
                    <label
                      key={m.usuario_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderBottom: i < miembros.length - 1 ? `1px solid ${C.border}` : "none",
                        cursor: "pointer",
                        background: incluido ? C.lightBlue : "white",
                        transition: "background 0.2s",
                      }}
                    >
                      <span aria-hidden="true">
                        <Avatar member={miembro} size={30} showBorder={false} />
                      </span>
                      <span style={{ flex: 1, fontFamily: NUNITO, color: C.navy, fontSize: 13, fontWeight: 700 }}>
                        {miembro.name}
                      </span>
                      {incluido && (
                        <span style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12 }}>
                          {parte === undefined ? "—" : conEuros(parte)}
                        </span>
                      )}
                      <input
                        type="checkbox"
                        checked={incluido}
                        onChange={() => alternarParticipante(m.usuario_id)}
                        aria-label={`Dividir con ${miembro.name}`}
                        style={{ width: 20, height: 20, accentColor: C.blue, cursor: "pointer", margin: 0 }}
                      />
                    </label>
                  )
                })}
              </div>
            </>
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
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || cargando}
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
              cursor: enviando || cargando ? "not-allowed" : "pointer",
              opacity: enviando || cargando ? 0.7 : 1,
              boxShadow: SHADOWS.button,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Icon name="plus" size={18} color="white" strokeWidth={2.5} />
            {enviando ? "Registrando gasto..." : "Registrar gasto"}
          </button>
        </form>
      </div>
    </div>
  )
}
