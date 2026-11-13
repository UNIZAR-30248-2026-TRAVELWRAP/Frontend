import { useEffect, useState } from "react"
import Avatar, { type Miembro } from "../components/Avatar"
import BarraInferior, { ALTO_BARRA_INFERIOR } from "../components/BarraInferior"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import { ApiError } from "../services/authApi"
import { obtenerGasto, type DetalleGasto as Detalle } from "../services/gastosApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { estiloAlerta } from "../styles/formulario"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import { CATEGORIAS_GASTO, conEuros, fechaDelGasto, iconoDeCategoriaGasto, tamanoSegunLongitud } from "../utils/gastos"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

// Miembro que ya no está en el viaje: se muestra sin nombre
const MIEMBRO_ABANDONADO: Miembro = { name: "Antiguo miembro", initial: "?", color: C.muted }

type DetalleGastoProps = {
  viajeId: string
  gastoId: string
  tokenSesion: string
  // Usuario de la sesión, para marcar su parte en el reparto
  usuarioId: string
  onVolver?: () => void
  onModificar?: () => void
}

// Pantalla: Detalle del gasto (importe, quién pagó y el reparto de cada miembro)
export default function DetalleGasto({ viajeId, gastoId, tokenSesion, usuarioId, onVolver, onModificar }: DetalleGastoProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [gasto, setGasto] = useState<Detalle | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let vigente = true
    Promise.all([obtenerViaje(viajeId, tokenSesion), obtenerGasto(viajeId, gastoId, tokenSesion)])
      .then(([datosViaje, datosGasto]) => {
        if (!vigente) return
        setViaje(datosViaje)
        setGasto(datosGasto)
      })
      .catch((e) => {
        if (vigente) setError(`No se ha podido cargar el gasto: ${mensajeDeError(e)}`)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, gastoId, tokenSesion])

  const miembros = viaje?.miembros ?? []
  const miembroDe = (usuarioDelGasto: string): Miembro => {
    const indice = miembros.findIndex((m) => m.usuario_id === usuarioDelGasto)
    return indice === -1 ? MIEMBRO_ABANDONADO : aMiembro(miembros[indice].nombre, indice)
  }
  const categoria = gasto ? CATEGORIAS_GASTO.find((c) => c.categoria === gasto.categoria) : undefined
  // Solo quien registró el gasto y el creador del viaje lo modifican, y solo con el viaje activo
  const puedeModificar = Boolean(
    viaje && gasto && viaje.estado === "activo" && (gasto.creado_por === usuarioId || viaje.rol === "creador"),
  )

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: ALTO_BARRA_INFERIOR + 24 }}>
        {/* Cabecera */}
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 24px", borderRadius: RADIUS.header }}>
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver a Control de Gastos"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: 4,
            }}
          >
            <Icon name="arrow_left" size={13} color="rgba(255,255,255,0.55)" strokeWidth={2.5} />
            <span
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: NUNITO,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Control de Gastos
            </span>
          </button>
          <Heading size={22} color="white">
            Detalle del gasto
          </Heading>
        </div>

        <div style={{ padding: "20px 16px 0" }}>
          {error && (
            <div role="alert" style={{ ...estiloAlerta, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {cargando && (
            <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center" }}>Cargando gasto...</p>
          )}

          {gasto && (
            <>
              {/* Importe, concepto y datos del gasto */}
              <section
                aria-label="Datos del gasto"
                style={{
                  background: "white",
                  borderRadius: RADIUS.xl,
                  padding: 20,
                  marginBottom: 16,
                  boxShadow: SHADOWS.cardRaised,
                  border: `1.5px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: NUNITO,
                    fontSize: tamanoSegunLongitud(conEuros(gasto.importe).length, 30, 20, 10, 18),
                    fontWeight: 900,
                    color: C.navy,
                    whiteSpace: "nowrap",
                  }}
                >
                  {conEuros(gasto.importe)}
                </div>
                <div style={{ fontFamily: NUNITO, color: C.navy, fontSize: 15, fontWeight: 700, marginTop: 6, overflowWrap: "anywhere" }}>
                  {gasto.concepto}
                </div>

                <dl
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "8px 14px",
                    margin: "16px 0 0",
                    fontFamily: NUNITO,
                    fontSize: 13,
                  }}
                >
                  <dt style={{ color: C.muted, fontWeight: 700 }}>Categoría</dt>
                  <dd style={{ margin: 0, color: C.navy, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name={iconoDeCategoriaGasto(gasto.categoria)} size={15} color={C.blue} strokeWidth={1.6} />
                    {categoria?.texto ?? gasto.categoria}
                  </dd>
                  <dt style={{ color: C.muted, fontWeight: 700 }}>Pagó</dt>
                  <dd style={{ margin: 0, color: miembroDe(gasto.pagado_por).color, fontWeight: 700 }}>
                    {miembroDe(gasto.pagado_por).name}
                  </dd>
                  <dt style={{ color: C.muted, fontWeight: 700 }}>Fecha</dt>
                  <dd style={{ margin: 0, color: C.navy }}>{fechaDelGasto(gasto.fecha)}</dd>
                </dl>
              </section>

              {/* Reparto: la parte de cada miembro, la tuya resaltada */}
              <section aria-label="Reparto del gasto" style={{ marginBottom: 16 }}>
                <SectionLabel>Reparto</SectionLabel>
                <ul
                  aria-label="Parte de cada miembro"
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    background: "white",
                    borderRadius: RADIUS.lg,
                    overflow: "hidden",
                    boxShadow: SHADOWS.card,
                    border: `1.5px solid ${C.border}`,
                  }}
                >
                  {gasto.repartos.map((reparto, i) => {
                    const miembro = reparto.abandonado ? MIEMBRO_ABANDONADO : miembroDe(reparto.usuario_id)
                    const tuya = reparto.usuario_id === usuarioId
                    return (
                      <li
                        key={reparto.usuario_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          background: tuya ? C.lightAccent : "transparent",
                          borderBottom: i < gasto.repartos.length - 1 ? `1px solid ${C.border}` : "none",
                        }}
                      >
                        <span aria-hidden="true">
                          <Avatar member={miembro} size={30} showBorder={false} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontFamily: NUNITO, fontSize: 13, fontWeight: 700, color: C.navy }}>
                          {reparto.abandonado ? "Antiguo miembro" : miembro.name}
                          {tuya && <span style={{ color: C.accent, fontWeight: 800 }}> (tú)</span>}
                        </span>
                        <span style={{ fontFamily: NUNITO, fontSize: 14, fontWeight: 900, color: C.navy, whiteSpace: "nowrap" }}>
                          {conEuros(reparto.importe)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>

              {puedeModificar && onModificar && (
                <button
                  type="button"
                  onClick={onModificar}
                  style={{
                    width: "100%",
                    background: C.blue,
                    color: "white",
                    border: "none",
                    borderRadius: RADIUS.md,
                    padding: 13,
                    fontFamily: NUNITO,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: SHADOWS.button,
                    marginBottom: 16,
                  }}
                >
                  Modificar
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <BarraInferior activa="gastos" />
    </div>
  )
}
