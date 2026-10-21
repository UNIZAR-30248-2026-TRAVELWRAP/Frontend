import { useEffect, useState, type CSSProperties } from "react"
import AvatarStack from "../components/AvatarStack"
import BarraInferior, { ALTO_BARRA_INFERIOR, type SeccionViaje } from "../components/BarraInferior"
import Badge from "../components/Badge"
import DialogoConfirmacion from "../components/DialogoConfirmacion"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import { ApiError } from "../services/authApi"
import { archivarViaje, obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro, formatearFechasActivo, formatearImporte } from "../utils/formatoViaje"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const tarjetaStyle: CSSProperties = {
  background: "white",
  borderRadius: RADIUS.lg,
  padding: 16,
  border: `1.5px solid ${C.border}`,
  boxShadow: SHADOWS.cardSoft,
}

const avisoStyle = (fondo: string, borde: string): CSSProperties => ({
  background: fondo,
  border: `1.5px solid ${borde}`,
  borderRadius: RADIUS.md,
  padding: 14,
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  fontFamily: NUNITO,
  fontSize: 13,
  lineHeight: 1.5,
  color: C.navy,
})

// Pantalla de inicio del viaje 
type InicioViajeProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  onEditar?: () => void
  onInvitar?: () => void
  // Tras cerrar el viaje (queda archivado)
  onArchivado?: (viaje: ViajeDelUsuario) => void
  onCambiarSeccion?: (seccion: SeccionViaje) => void
}

export default function InicioViaje({
  viajeId,
  tokenSesion,
  onVolver,
  onEditar,
  onInvitar,
  onArchivado,
  onCambiarSeccion,
}: InicioViajeProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [error, setError] = useState("")
  const [confirmandoCierre, setConfirmandoCierre] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [errorCierre, setErrorCierre] = useState("")

  useEffect(() => {
    let vigente = true
    obtenerViaje(viajeId, tokenSesion)
      .then((datos) => {
        if (vigente) setViaje(datos)
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e))
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  const handleCerrarViaje = async () => {
    setCerrando(true)
    setErrorCierre("")
    try {
      const archivado = await archivarViaje(viajeId, tokenSesion)
      setViaje(archivado)
      setConfirmandoCierre(false)
      onArchivado?.(archivado)
    } catch (e) {
      setErrorCierre(mensajeDeError(e))
    } finally {
      setCerrando(false)
    }
  }

  const activo = viaje?.estado === "activo"
  const esCreador = viaje?.rol === "creador"
  const miembros = (viaje?.miembros ?? []).map((m, i) => aMiembro(m.nombre, i))

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: ALTO_BARRA_INFERIOR + 24 }}>
        {/* Cabecera: viaje, destino, fechas y presupuesto */}
        <div style={{ background: GRADIENTS.hero, padding: "20px 20px 24px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <button
                type="button"
                onClick={onVolver}
                aria-label="Volver a Mis Viajes"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 16,
                }}
              >
                <Icon name="arrow_left" size={13} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
                <span
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: NUNITO,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Mis Viajes
                </span>
              </button>

              {viaje && (
                <>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                      fontFamily: NUNITO,
                      fontWeight: 800,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    {viaje.nombre}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="pin" size={24} color={C.accent} strokeWidth={2.2} />
                    <Heading size={viaje.destino ? 32 : 24} color="white">
                      {viaje.destino ?? "Destino por decidir"}
                    </Heading>
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 13,
                      fontFamily: NUNITO,
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Icon name="calendar" size={13} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                    {formatearFechasActivo(viaje.fecha_inicio, viaje.fecha_fin)}
                  </div>
                </>
              )}
            </div>

            {viaje && activo && esCreador && (
              <button
                type="button"
                onClick={() => {
                  setErrorCierre("")
                  setConfirmandoCierre(true)
                }}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 11,
                  fontFamily: NUNITO,
                  fontWeight: 700,
                }}
              >
                <Icon name="finish" size={13} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
                Cerrar viaje
              </button>
            )}
            {viaje && !activo && (
              <Badge bg="rgba(255,255,255,0.2)" color="white">
                {viaje.estado === "archivado" ? "Archivado" : "Finalizado"}
              </Badge>
            )}
          </div>

          {viaje && (
            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                borderRadius: RADIUS.lg,
                padding: 16,
                border: "1px solid rgba(255,255,255,0.15)",
                marginTop: 28,
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: NUNITO,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Presupuesto
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: NUNITO, fontSize: 40, fontWeight: 900, color: "white", lineHeight: 1 }}>
                  {formatearImporte(viaje.presupuesto, viaje.moneda)}
                </div>
                <div style={{ fontFamily: NUNITO, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>total</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
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
              }}
            >
              No se ha podido cargar el viaje: {error}
            </div>
          )}

          {viaje && !activo && (
            <div style={avisoStyle(C.lightAccent, `${C.accent}40`)}>
              <Icon name="lock" size={18} color={C.accent} strokeWidth={2} />
              <span>
                Este viaje está {viaje.estado === "archivado" ? "archivado" : "cerrado"}: puedes consultarlo, pero ya no se
                pueden modificar sus datos ni añadir actividades o gastos.
              </span>
            </div>
          )}

          {viaje?.pendiente_destino && (
            <div style={avisoStyle(C.greenBg, `${C.greenMid}40`)}>
              <Icon name="vote" size={18} color={C.green} strokeWidth={2} />
              <span>El destino se decidirá por votación entre los viajeros (disponible próximamente).</span>
            </div>
          )}

          {viaje && (
            <div style={tarjetaStyle}>
              <SectionLabel>
                {miembros.length} {miembros.length === 1 ? "viajero" : "viajeros"}
              </SectionLabel>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <AvatarStack members={miembros} size={36} max={5} />
                {activo && (
                  <button
                    type="button"
                    onClick={onInvitar}
                    style={{
                      background: C.lightBlue,
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      color: C.blue,
                      fontSize: 12,
                      fontFamily: NUNITO,
                      fontWeight: 800,
                    }}
                  >
                    <Icon name="plus" size={13} color={C.blue} strokeWidth={2.5} />
                    Invitar
                  </button>
                )}
              </div>
            </div>
          )}

          {viaje && activo && esCreador && (
            <button
              type="button"
              onClick={onEditar}
              style={{
                ...tarjetaStyle,
                width: "100%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  background: C.lightBlue,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="settings" size={21} color={C.blue} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: NUNITO, fontWeight: 800, color: C.navy, fontSize: 14 }}>Editar viaje</div>
                <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, marginTop: 2 }}>
                  Nombre, fechas, destino y presupuesto
                </div>
              </div>
              <Icon name="arrow_right" size={18} color={C.muted} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <BarraInferior activa="inicio" onCambiar={onCambiarSeccion} />

      {confirmandoCierre && (
        <DialogoConfirmacion
          titulo="¿Cerrar este viaje?"
          icono="finish"
          color={C.accent}
          colorFondo={C.lightAccent}
          textoConfirmar="Cerrar viaje"
          textoConfirmando="Cerrando viaje..."
          ocupado={cerrando}
          error={errorCierre}
          onConfirmar={handleCerrarViaje}
          onCancelar={() => setConfirmandoCierre(false)}
        >
          El viaje pasará a «Viajes archivados» y quedará de solo lectura: ya no se podrán editar sus datos ni añadir
          actividades o gastos.
          <strong style={{ display: "block", color: C.red, marginTop: 6 }}>Esta acción no se puede deshacer.</strong>
        </DialogoConfirmacion>
      )}
    </div>
  )
}
