import { useEffect, useState } from "react"
import Badge from "../components/Badge"
import DialogoConfirmacion from "../components/DialogoConfirmacion"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import { ApiError } from "../services/authApi"
import { eliminarViaje, listarViajes, type ViajeDelUsuario } from "../services/viajesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { formatearFechasAnterior, formatearImporte } from "../utils/formatoViaje"

const ICONOS = ["map", "route", "flight"]

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

// Pantalla de viajes archivados 
type ViajesArchivadosProps = {
  tokenSesion: string
  onVolver?: () => void
  onVerViaje?: (id: string) => void
}

export default function ViajesArchivados({ tokenSesion, onVolver, onVerViaje }: ViajesArchivadosProps) {
  const [viajes, setViajes] = useState<ViajeDelUsuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [aEliminar, setAEliminar] = useState<ViajeDelUsuario | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState("")

  useEffect(() => {
    let vigente = true
    listarViajes(tokenSesion, "archivado")
      .then((respuesta) => {
        if (vigente) setViajes(respuesta.viajes)
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e))
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [tokenSesion])

  const handleEliminar = async () => {
    if (!aEliminar) return
    setEliminando(true)
    setErrorEliminar("")
    try {
      await eliminarViaje(aEliminar.id, tokenSesion)
      setViajes((actuales) => actuales.filter((v) => v.id !== aEliminar.id))
      setAEliminar(null)
    } catch (e) {
      setErrorEliminar(mensajeDeError(e))
    } finally {
      setEliminando(false)
    }
  }

  const sinViajes = !cargando && !error && viajes.length === 0

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Cabecera */}
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 26px", borderRadius: RADIUS.header }}>
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
                Viajes archivados
              </Heading>
              <div style={{ color: "rgba(255,255,255,0.65)", fontFamily: NUNITO, fontSize: 12, marginTop: 2 }}>
                Revive el Wrap de cada aventura
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "22px 16px 32px" }}>
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
              No se han podido cargar los viajes archivados: {error}
            </div>
          )}

          {sinViajes && (
            <div
              style={{
                background: "white",
                borderRadius: RADIUS.lg,
                border: `1.5px solid ${C.border}`,
                padding: "22px 18px",
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: NUNITO, color: C.navy, fontSize: 16, fontWeight: 800 }}>
                No tienes viajes archivados
              </div>
              <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                Cuando cierres un viaje aparecerá aquí, de solo lectura.
              </div>
            </div>
          )}

          {viajes.length > 0 && (
            <>
              <SectionLabel>
                {viajes.length} {viajes.length === 1 ? "viaje guardado" : "viajes guardados"}
              </SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {viajes.map((viaje, indice) => (
                  <div
                    key={viaje.id}
                    style={{
                      background: "white",
                      border: `1.5px solid ${C.border}`,
                      borderRadius: 19,
                      padding: "10px 10px 10px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      boxShadow: SHADOWS.card,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onVerViaje?.(viaje.id)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        background: "transparent",
                        border: "none",
                        padding: "6px 0",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        textAlign: "left",
                        fontFamily: NUNITO,
                      }}
                    >
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 15,
                          background: C.lightBlue,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name={ICONOS[indice % ICONOS.length]} size={23} color={C.blue} strokeWidth={1.7} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: NUNITO, color: C.navy, fontSize: 15, fontWeight: 900 }}>
                          {viaje.nombre}
                        </div>
                        <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 11, marginTop: 2 }}>
                          {viaje.destino ? `${viaje.destino} · ` : ""}
                          {formatearFechasAnterior(viaje.fecha_inicio, viaje.fecha_fin)}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                          <Badge bg={C.bg} color={C.muted}>
                            {viaje.miembros.length} {viaje.miembros.length === 1 ? "viajero" : "viajeros"}
                          </Badge>
                          <Badge bg={C.lightAccent} color={C.accent}>
                            {formatearImporte(viaje.presupuesto, viaje.moneda)}
                          </Badge>
                        </div>
                      </div>
                    </button>
                    {/* Solo el creador puede eliminar el viaje, para todos sus miembros */}
                    {viaje.rol === "creador" && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorEliminar("")
                          setAEliminar(viaje)
                        }}
                        aria-label={`Eliminar ${viaje.nombre}`}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 11,
                          background: C.redBg,
                          border: `1px solid ${C.red}30`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="trash" size={17} color={C.red} strokeWidth={1.9} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {aEliminar && (
        <DialogoConfirmacion
          titulo="¿Eliminar este viaje?"
          icono="trash"
          color={C.red}
          colorFondo={C.redBg}
          textoConfirmar="Eliminar viaje"
          textoConfirmando="Eliminando..."
          ocupado={eliminando}
          error={errorEliminar}
          onConfirmar={handleEliminar}
          onCancelar={() => setAEliminar(null)}
        >
          Se eliminarán <strong style={{ color: C.navy }}>{aEliminar.nombre}</strong> y todos sus datos para todos los
          viajeros. Esta acción no se puede deshacer.
        </DialogoConfirmacion>
      )}
    </div>
  )
}
