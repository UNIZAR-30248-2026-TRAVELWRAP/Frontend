import { useEffect, useState, type CSSProperties } from "react"
import BotonVolver from "../components/BotonVolver"
import AvatarStack from "../components/AvatarStack"
import BarraInferior, { ALTO_BARRA_INFERIOR, type SeccionViaje } from "../components/BarraInferior"
import Badge from "../components/Badge"
import DialogoConfirmacion from "../components/DialogoConfirmacion"
import FondoPortada from "../components/FondoPortada"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import TarjetaPlaylist from "../components/TarjetaPlaylist"
import IconoColor from "../components/IconoColor"
import { ApiError } from "../services/authApi"
import { abandonarViaje, finalizarViaje, obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { viajeEnCache } from "../services/viajesEnCache"
import { obtenerBalance } from "../services/gastosApi"
import { obtenerResumenDelViaje, type PresupuestoRestante } from "../services/resumenApi"
import { listarActividades, type Actividad } from "../services/actividadesApi"
import TarjetaProximaActividad from "../components/TarjetaProximaActividad"
import { useAhora } from "../hooks/useAhora"
import { proximaActividad } from "../utils/actividadEnCurso"
import { listarTareas } from "../services/tareasApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { ESTILO_CON_PORTADA } from "../styles/portada"
import { aMiembro, formatearFechasActivo, formatearImporte } from "../utils/formatoViaje"
import { conEuros } from "../utils/gastos"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const tarjetaStyle: CSSProperties = {
  background: "white",
  borderRadius: RADIUS.lg,
  padding: "10px 12px",
  border: `1.5px solid ${C.border}`,
  boxShadow: SHADOWS.cardSoft,
}

const botonCuadradoStyle: CSSProperties = {
  width: 78,
  height: 60,
  background: "white",
  border: `1.5px solid ${C.border}`,
  borderRadius: RADIUS.lg,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  flexShrink: 0,
}

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
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(() => viajeEnCache(viajeId))
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
  const [presupuesto, setPresupuesto] = useState<PresupuestoRestante | null>(null)
  const [actividades, setActividades] = useState<Actividad[]>([])
  const ahora = useAhora()

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

  // Lo que queda del presupuesto según los gastos; si no se puede cargar, la cifra simplemente no se muestra
  useEffect(() => {
    let vigente = true
    obtenerResumenDelViaje(viajeId, tokenSesion)
      .then((resumen) => {
        if (vigente) setPresupuesto(resumen.presupuesto)
      })
      .catch(() => {
        if (vigente) setPresupuesto(null)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  // Actividades del viaje para la próxima actividad; si no se pueden cargar, la tarjeta no se muestra
  useEffect(() => {
    let vigente = true
    listarActividades(viajeId, tokenSesion)
      .then((respuesta) => {
        if (vigente) setActividades(respuesta.actividades ?? [])
      })
      .catch(() => {
        if (vigente) setActividades([])
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  // Solo un viaje activo tiene una próxima actividad que enseñar
  const proxima = viaje?.estado === "activo" ? proximaActividad(actividades, ahora) : null

  // Porcentaje del presupuesto ya gastado, sin pasar del 100 %; sin presupuesto no hay barra
  const porcentajeGastado =
    presupuesto && presupuesto.total > 0 ? Math.min(100, Math.round((presupuesto.gastado / presupuesto.total) * 100)) : 0

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
  const miembros = (viaje?.miembros ?? []).map((m, i) => aMiembro(m.nombre, i, m.avatar_url))

  if (pendiente) return null

  return (
    <div style={{ background: C.bg, minHeight: "100dvh" }}>
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          minHeight: "100dvh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          paddingBottom: ALTO_BARRA_INFERIOR,
        }}
      >
        {/* Cabecera: viaje, destino, fechas y presupuesto */}
        <div
          style={{ ...ESTILO_CON_PORTADA, background: GRADIENTS.hero, padding: "8px 20px 12px", borderRadius: RADIUS.header }}
        >
          <FondoPortada url={viaje?.portada_url} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
            <BotonVolver onClick={onVolver} etiqueta="Volver a Mis Viajes" texto="Mis Viajes" />

            {/* Cualquier miembro puede finalizar el viaje o abandonarlo */}
            {viaje && activo && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: "auto" }}>
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
                  padding: "8px 10px",
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
              <button
                type="button"
                onClick={handlePedirAbandonar}
                disabled={comprobandoSaldo}
                style={{
                  background: "rgba(220,38,38,0.15)",
                  border: "1px solid rgba(220,38,38,0.3)",
                  borderRadius: 10,
                  padding: "8px 10px",
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
              </div>
            )}
            {viaje && !activo && (
              <Badge bg="rgba(255,255,255,0.2)" color="white">
                Finalizado
              </Badge>
            )}
          </div>

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
                <IconoColor name="pin" size={24} />
                <Heading size={viaje.destino ? 26 : 22} color="white">
                  {viaje.destino ?? "Destino por decidir"}
                </Heading>
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 12,
                  fontFamily: NUNITO,
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="calendar" size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                {formatearFechasActivo(viaje.fecha_inicio, viaje.fecha_fin)}
              </div>
            </>
          )}

          {viaje && (
            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                borderRadius: RADIUS.lg,
                padding: "10px 14px",
                border: "1px solid rgba(255,255,255,0.15)",
                marginTop: 10,
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: NUNITO,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Presupuesto
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: NUNITO, fontSize: 30, fontWeight: 900, color: "white", lineHeight: 1.1 }}>
                  {formatearImporte(viaje.presupuesto, viaje.moneda)}
                </div>
                <div style={{ fontFamily: NUNITO, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>total</div>
              </div>
              {presupuesto && (
                <div data-testid="presupuesto-progreso" style={{ marginTop: 6 }}>
                  <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 6, height: 6 }}>
                    <div
                      style={{
                        background: porcentajeGastado > 90 ? C.red : C.accent,
                        borderRadius: 6,
                        height: 6,
                        width: `${porcentajeGastado}%`,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontFamily: NUNITO }}>
                      Gastado {formatearImporte(presupuesto.gastado, viaje.moneda)}
                    </span>
                    <span
                      style={{
                        color: porcentajeGastado > 90 ? "#FC8181" : "#F6AD55",
                        fontSize: 11,
                        fontFamily: NUNITO,
                        fontWeight: 700,
                      }}
                    >
                      {porcentajeGastado}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1, padding: "10px 16px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {proxima && <TarjetaProximaActividad actividad={proxima} ahora={ahora} />}
          {viaje && <TarjetaPlaylist viajeId={viajeId} tokenSesion={tokenSesion} activo={viaje.estado === "activo"} />}
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
                  width: 36,
                  height: 36,
                  borderRadius: 12,
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

          {/* Al final y pegado a la barra inferior: viajeros con «Invitar» a la izquierda; votaciones y ajustes a la derecha.
              No flota sobre el contenido: si no cabe, queda debajo de las tarjetas y se llega desplazando */}
          {viaje && (
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                <div role="group" aria-label={`${miembros.length} ${miembros.length === 1 ? "viajero" : "viajeros"}`}>
                  <AvatarStack members={miembros} size={32} max={5} />
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
              <div style={{ display: "flex", gap: 10 }}>
                {activo && (
                  <button type="button" onClick={onVotaciones} style={botonCuadradoStyle}>
                    <IconoColor name="vote" size={24} />
                    <span style={{ fontFamily: NUNITO, fontWeight: 800, fontSize: 11, color: C.navy }}>Votaciones</span>
                  </button>
                )}
                {/* Cualquier miembro edita los datos y la portada del viaje */}
                {activo && (
                  <button type="button" onClick={onEditar} style={botonCuadradoStyle}>
                    <Icon name="settings" size={22} color={C.blue} strokeWidth={1.8} />
                    <span style={{ fontFamily: NUNITO, fontWeight: 800, fontSize: 11, color: C.navy, whiteSpace: "nowrap" }}>
                      Editar viaje
                    </span>
                  </button>
                )}
              </div>
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
