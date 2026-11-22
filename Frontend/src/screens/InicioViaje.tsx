import { useEffect, useState, type CSSProperties } from "react"
import AvatarStack from "../components/AvatarStack"
import BarraInferior, { ALTO_BARRA_INFERIOR, type SeccionViaje } from "../components/BarraInferior"
import Badge from "../components/Badge"
import DialogoConfirmacion from "../components/DialogoConfirmacion"
import FondoPortada from "../components/FondoPortada"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import IconoColor from "../components/IconoColor"
import { ApiError } from "../services/authApi"
import { abandonarViaje, finalizarViaje, obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { obtenerBalance } from "../services/gastosApi"
import { listarTareas } from "../services/tareasApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { ESTILO_CON_PORTADA } from "../styles/portada"
import { aMiembro, formatearFechasActivo, formatearImporte } from "../utils/formatoViaje"
import { conEuros } from "../utils/gastos"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const tarjetaStyle: CSSProperties = {
  background: "white",
  borderRadius: RADIUS.lg,
  padding: 16,
  border: `1.5px solid ${C.border}`,
  boxShadow: SHADOWS.cardSoft,
}

const botonCuadradoStyle: CSSProperties = {
  width: 80,
  height: 80,
  background: "white",
  border: `1.5px solid ${C.border}`,
  borderRadius: RADIUS.lg,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  flexShrink: 0,
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
  onVotaciones?: () => void
  // Abre la «Lista de tareas» de la cartera
  onTareas?: () => void
  onResumen?: () => void
  // Un viaje sin destino solo muestra la votación del destino
  onPendienteDestino?: () => void
  // Tras finalizar el viaje (queda finalizado, en «Viajes anteriores»)
  onFinalizado?: (viaje: ViajeDelUsuario) => void
  onCambiarSeccion?: (seccion: SeccionViaje) => void
  // Usuario de la sesión: su saldo decide si puede abandonar el viaje
  usuarioId: string
  // Tras abandonar el viaje (ya no es miembro) se vuelve a Mis Viajes
  onAbandonado?: () => void
}

export default function InicioViaje({
  viajeId,
  tokenSesion,
  onVolver,
  onEditar,
  onInvitar,
  onVotaciones,
  onTareas,
  onResumen,
  onPendienteDestino,
  onFinalizado,
  onCambiarSeccion,
  usuarioId,
  onAbandonado,
}: InicioViajeProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [error, setError] = useState("")
  const [confirmandoFinalizar, setConfirmandoFinalizar] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [errorFinalizar, setErrorFinalizar] = useState("")
  const [dialogoAbandono, setDialogoAbandono] = useState<"cerrado" | "saldo" | "confirmar">("cerrado")
  const [saldoAbandono, setSaldoAbandono] = useState(0)
  const [comprobandoSaldo, setComprobandoSaldo] = useState(false)
  const [abandonando, setAbandonando] = useState(false)
  const [errorAbandonar, setErrorAbandonar] = useState("")
  const [tareasPendientes, setTareasPendientes] = useState(0)

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

  // Tareas pendientes asignadas al usuario; si no se pueden cargar, la tarjeta simplemente no se muestra
  useEffect(() => {
    let vigente = true
    listarTareas(viajeId, tokenSesion)
      .then(({ tareas }) => {
        if (vigente) setTareasPendientes(tareas.filter((t) => !t.hecha && t.responsable?.usuario_id === usuarioId).length)
      })
      .catch(() => {
        if (vigente) setTareasPendientes(0)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion, usuarioId])

  // Un viaje pendiente de destino solo muestra la votación del destino
  const pendiente = viaje?.pendiente_destino === true
  useEffect(() => {
    if (pendiente) onPendienteDestino?.()
  }, [pendiente, onPendienteDestino])

  const handleFinalizarViaje = async () => {
    setCerrando(true)
    setErrorFinalizar("")
    try {
      const finalizado = await finalizarViaje(viajeId, tokenSesion)
      setViaje(finalizado)
      setConfirmandoFinalizar(false)
      onFinalizado?.(finalizado)
    } catch (e) {
      setErrorFinalizar(mensajeDeError(e))
    } finally {
      setCerrando(false)
    }
  }

  // Antes de abandonar se mira el saldo de quien lo pide: solo puede dejar el viaje con el saldo a cero
  const handlePedirAbandonar = async () => {
    setComprobandoSaldo(true)
    setErrorAbandonar("")
    try {
      const balance = await obtenerBalance(viajeId, tokenSesion)
      const saldo = balance.saldos.find((s) => s.usuario_id === usuarioId)?.saldo ?? 0
      setSaldoAbandono(saldo)
      setDialogoAbandono(Math.abs(saldo) < 0.005 ? "confirmar" : "saldo")
    } catch (e) {
      setErrorAbandonar(`No se ha podido comprobar tu saldo: ${mensajeDeError(e)}`)
    } finally {
      setComprobandoSaldo(false)
    }
  }

  const handleAbandonar = async () => {
    setAbandonando(true)
    setErrorAbandonar("")
    try {
      await abandonarViaje(viajeId, tokenSesion)
      setDialogoAbandono("cerrado")
      onAbandonado?.()
    } catch (e) {
      setErrorAbandonar(mensajeDeError(e))
    } finally {
      setAbandonando(false)
    }
  }

  const activo = viaje?.estado === "activo"
  const esCreador = viaje?.rol === "creador"
  const miembros = (viaje?.miembros ?? []).map((m, i) => aMiembro(m.nombre, i, m.avatar_url))

  if (pendiente) return null

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: ALTO_BARRA_INFERIOR + 24 }}>
        {/* Cabecera: viaje, destino, fechas y presupuesto */}
        <div
          style={{ ...ESTILO_CON_PORTADA, background: GRADIENTS.hero, padding: "20px 20px 24px", borderRadius: RADIUS.header }}
        >
          <FondoPortada url={viaje?.portada_url} />
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
                    <IconoColor name="pin" size={28} />
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
                  setErrorFinalizar("")
                  setConfirmandoFinalizar(true)
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
                Finalizar viaje
              </button>
            )}
            {viaje && activo && !esCreador && (
              <button
                type="button"
                onClick={handlePedirAbandonar}
                disabled={comprobandoSaldo}
                style={{
                  background: "rgba(220,38,38,0.15)",
                  border: "1px solid rgba(220,38,38,0.3)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: comprobandoSaldo ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <Icon name="trash" size={13} color="#FEB2B2" strokeWidth={2.5} />
                <span style={{ color: "#FEB2B2", fontSize: 11, fontFamily: NUNITO, fontWeight: 700 }}>
                  {comprobandoSaldo ? "Comprobando..." : "Abandonar"}
                </span>
              </button>
            )}
            {viaje && !activo && (
              <Badge bg="rgba(255,255,255,0.2)" color="white">
                Finalizado
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
                Este viaje está finalizado: puedes consultarlo, pero ya no se
                pueden modificar sus datos ni añadir actividades o gastos.
              </span>
            </div>
          )}

          {/* Anclado sobre la barra inferior: viajeros con «Invitar» a la izquierda; votaciones y ajustes a la derecha */}
          {viaje && (
            <div
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: ALTO_BARRA_INFERIOR,
                zIndex: 20,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  maxWidth: 480,
                  margin: "0 auto",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, pointerEvents: "auto" }}>
                  <div role="group" aria-label={`${miembros.length} ${miembros.length === 1 ? "viajero" : "viajeros"}`}>
                    <AvatarStack members={miembros} size={36} max={5} />
                  </div>
                  {activo && (
                    <button
                      type="button"
                      onClick={onInvitar}
                      style={{
                        background: C.lightBlue,
                        border: "none",
                        borderRadius: 8,
                        padding: "4px 11px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: C.blue,
                        fontSize: 10,
                        fontFamily: NUNITO,
                        fontWeight: 700,
                      }}
                    >
                      <Icon name="plus" size={11} color={C.blue} strokeWidth={2.5} />
                      Invitar
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10, pointerEvents: "auto" }}>
                  {activo && (
                    <button type="button" onClick={onVotaciones} style={botonCuadradoStyle}>
                      <IconoColor name="vote" size={28} />
                      <span style={{ fontFamily: NUNITO, fontWeight: 800, fontSize: 11, color: C.navy }}>Votaciones</span>
                    </button>
                  )}
                  {/* El creador edita los datos del viaje; cualquier miembro puede cambiar su portada */}
                  {activo && (
                    <button type="button" onClick={onEditar} style={botonCuadradoStyle}>
                      <Icon name={esCreador ? "settings" : "camera"} size={26} color={C.blue} strokeWidth={1.8} />
                      <span style={{ fontFamily: NUNITO, fontWeight: 800, fontSize: 11, color: C.navy }}>
                        {esCreador ? "Editar viaje" : "Cambiar portada"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Solo aparece si el usuario tiene tareas pendientes asignadas */}
          {viaje && activo && tareasPendientes > 0 && (
            <button
              type="button"
              onClick={onTareas}
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
                <Icon name="task" size={22} color={C.blue} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: NUNITO, fontWeight: 800, color: C.navy, fontSize: 14 }}>Tareas pendientes</div>
                <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, marginTop: 2 }}>
                  {tareasPendientes === 1 ? "1 tarea por completar" : `${tareasPendientes} tareas por completar`}
                </div>
              </div>
              <span style={{ fontFamily: NUNITO, fontWeight: 800, color: C.blue, fontSize: 12 }}>Ver todas</span>
              <Icon name="arrow_right" size={16} color={C.blue} strokeWidth={2} />
            </button>
          )}

          {viaje && !activo && (
            <button
              type="button"
              onClick={onResumen}
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
                  background: C.lightAccent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconoColor name="medal" size={25} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: NUNITO, fontWeight: 800, color: C.navy, fontSize: 14 }}>Resumen del viaje</div>
                <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, marginTop: 2 }}>
                  Revive el Wrap: días, gastos y el momento estrella
                </div>
              </div>
              <Icon name="arrow_right" size={18} color={C.muted} strokeWidth={2} />
            </button>
          )}

          {errorAbandonar && dialogoAbandono === "cerrado" && (
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
              {errorAbandonar}
            </div>
          )}

        </div>
      </div>

      <BarraInferior activa="inicio" onCambiar={onCambiarSeccion} />

      {confirmandoFinalizar && (
        <DialogoConfirmacion
          titulo="¿Finalizar este viaje?"
          icono="finish"
          color={C.accent}
          colorFondo={C.lightAccent}
          textoConfirmar="Finalizar viaje"
          textoConfirmando="Finalizando viaje..."
          ocupado={cerrando}
          error={errorFinalizar}
          onConfirmar={handleFinalizarViaje}
          onCancelar={() => setConfirmandoFinalizar(false)}
        >
          El viaje pasará a «Viajes anteriores» en Mis viajes y quedará de solo lectura: ya no se podrán editar sus datos ni añadir
          actividades o gastos.
          <strong style={{ display: "block", color: C.red, marginTop: 6 }}>Esta acción no se puede deshacer.</strong>
        </DialogoConfirmacion>
      )}

      {dialogoAbandono === "saldo" && (
        <DialogoConfirmacion
          titulo="Tienes cuentas pendientes"
          icono="euro"
          color={C.blue}
          colorFondo={C.lightBlue}
          textoConfirmar="Ir a Control de Gastos"
          textoConfirmando="Abriendo Control de Gastos..."
          ocupado={false}
          onConfirmar={() => {
            setDialogoAbandono("cerrado")
            onCambiarSeccion?.("gastos")
          }}
          onCancelar={() => setDialogoAbandono("cerrado")}
        >
          {saldoAbandono < 0 ? `Debes ${conEuros(-saldoAbandono)} en este viaje.` : `Te deben ${conEuros(saldoAbandono)} en este viaje.`}{" "}
          Para abandonarlo, tu saldo tiene que estar a cero: salda tus cuentas en Control de Gastos y vuelve a intentarlo.
        </DialogoConfirmacion>
      )}

      {dialogoAbandono === "confirmar" && (
        <DialogoConfirmacion
          titulo="¿Abandonar este viaje?"
          icono="logout"
          color={C.red}
          colorFondo={C.redBg}
          textoConfirmar="Abandonar viaje"
          textoConfirmando="Abandonando viaje..."
          ocupado={abandonando}
          error={errorAbandonar}
          onConfirmar={handleAbandonar}
          onCancelar={() => setDialogoAbandono("cerrado")}
        >
          Dejarás de ver este viaje en Mis viajes. Tus gastos se conservan y apareces como «Antiguo miembro». Para volver,
          tendrás que entrar de nuevo con un enlace de invitación.
        </DialogoConfirmacion>
      )}
    </div>
  )
}
