import { useRef, useState, type ChangeEvent } from "react"
import Avatar from "../components/Avatar"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import type { Usuario } from "../services/authApi"
import { actualizarNombre, quitarAvatar, subirAvatar } from "../services/perfilApi"
import { C, NUNITO, RADIUS } from "../styles/tokens"
import { mensajeErrorPerfil, prepararAvatar, validarFotoAvatar } from "../utils/avatar"

const estiloOpcionHoja = (color: string) => ({
  minHeight: 44,
  border: `1.5px solid ${C.border}`,
  borderRadius: 13,
  background: "white",
  color,
  fontFamily: NUNITO,
  fontWeight: 800,
  cursor: "pointer",
})

type PerfilProps = {
  nombre: string
  email: string
  avatarUrl?: string | null
  // Token de sesión con el que se edita el perfil
  token?: string
  // Recibe el usuario que devuelve el servidor, para guardarlo en la sesión
  onPerfilActualizado?: (usuario: Usuario) => void
  onVolver?: () => void
  onVerArchivados?: () => void
  onCerrarSesion?: () => void
  cerrandoSesion?: boolean
  error?: string
}

export default function Perfil({
  nombre,
  email,
  avatarUrl = null,
  token = "",
  onPerfilActualizado,
  onVolver,
  onVerArchivados,
  onCerrarSesion,
  cerrandoSesion = false,
  error,
}: PerfilProps) {
  const [confirmando, setConfirmando] = useState(false)
  const selectorFoto = useRef<HTMLInputElement>(null)
  const [hojaFoto, setHojaFoto] = useState(false)
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false)
  const [procesandoFoto, setProcesandoFoto] = useState<"subiendo" | "quitando" | null>(null)
  const [errorFoto, setErrorFoto] = useState("")
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(nombre)
  const [guardando, setGuardando] = useState(false)
  const [errorNombre, setErrorNombre] = useState("")

  const usuario = { name: nombre, initial: nombre.charAt(0).toUpperCase(), color: C.accent, imageUrl: avatarUrl }
  const nombreVacio = borrador.trim() === ""
  const puedeGuardar = !guardando && !nombreVacio && borrador.trim() !== nombre

  const handleTocarAvatar = () => {
    if (avatarUrl) setHojaFoto(true)
    else selectorFoto.current?.click()
  }

  const handleElegirOtraFoto = () => {
    setHojaFoto(false)
    selectorFoto.current?.click()
  }

  const handlePedirQuitarFoto = () => {
    setHojaFoto(false)
    setConfirmandoQuitar(true)
  }

  const handleFotoElegida = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    // Se vacía para que volver a elegir la misma foto también dispare onChange
    e.target.value = ""
    if (!archivo) return
    setErrorFoto("")
    const motivo = validarFotoAvatar(archivo)
    if (motivo) {
      setErrorFoto(motivo)
      return
    }
    setProcesandoFoto("subiendo")
    try {
      const actualizado = await subirAvatar(await prepararAvatar(archivo), token)
      onPerfilActualizado?.(actualizado)
    } catch (error) {
      setErrorFoto(mensajeErrorPerfil(error))
    } finally {
      setProcesandoFoto(null)
    }
  }

  const handleQuitarFoto = async () => {
    setConfirmandoQuitar(false)
    setErrorFoto("")
    setProcesandoFoto("quitando")
    try {
      onPerfilActualizado?.(await quitarAvatar(token))
    } catch (error) {
      setErrorFoto(mensajeErrorPerfil(error))
    } finally {
      setProcesandoFoto(null)
    }
  }

  const handleEditarNombre = () => {
    setBorrador(nombre)
    setErrorNombre("")
    setEditando(true)
  }

  const handleCancelarNombre = () => {
    setEditando(false)
    setErrorNombre("")
  }

  const handleGuardarNombre = async () => {
    if (!puedeGuardar) return
    setGuardando(true)
    setErrorNombre("")
    try {
      onPerfilActualizado?.(await actualizarNombre(borrador.trim(), token))
      setEditando(false)
    } catch (error) {
      setErrorNombre(mensajeErrorPerfil(error))
    } finally {
      setGuardando(false)
    }
  }

  const handleConfirmar = () => {
    onCerrarSesion?.()
    setConfirmando(false)
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div
          style={{
            background: `linear-gradient(160deg, ${C.navy} 0%, ${C.blue} 100%)`,
            padding: "20px 20px 32px",
            borderRadius: RADIUS.header,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button
              type="button"
              onClick={onVolver}
              aria-label="Volver"
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "none",
                borderRadius: 12,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Icon name="arrow_left" size={18} color="white" strokeWidth={2.5} />
            </button>
            <Heading size={22} color="white">
              Mi Perfil
            </Heading>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={handleTocarAvatar}
              disabled={procesandoFoto !== null}
              aria-label="Cambiar foto de perfil"
              style={{
                position: "relative",
                width: 88,
                height: 88,
                padding: 0,
                background: "none",
                border: "none",
                borderRadius: "50%",
                cursor: procesandoFoto ? "not-allowed" : "pointer",
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  boxSizing: "border-box",
                  borderRadius: "50%",
                  border: "3px solid rgba(255,255,255,0.4)",
                  overflow: "hidden",
                  opacity: procesandoFoto ? 0.5 : 1,
                }}
              >
                <Avatar member={usuario} size={82} showBorder={false} />
              </div>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="camera" size={15} color={C.navy} strokeWidth={2} />
              </span>
            </button>
            <input
              ref={selectorFoto}
              type="file"
              accept="image/jpeg,image/png"
              hidden
              aria-label="Elegir foto de perfil"
              onChange={handleFotoElegida}
            />
            {procesandoFoto && (
              <span role="status" style={{ fontFamily: NUNITO, fontSize: 13, fontWeight: 700, color: "white" }}>
                {procesandoFoto === "subiendo" ? "Subiendo…" : "Quitando…"}
              </span>
            )}
            {errorFoto && (
              <div
                role="alert"
                style={{
                  background: C.redBg,
                  borderRadius: 12,
                  padding: "8px 12px",
                  color: C.red,
                  fontFamily: NUNITO,
                  fontSize: 13,
                  fontWeight: 700,
                  maxWidth: "100%",
                  boxSizing: "border-box",
                }}
              >
                {errorFoto}
              </div>
            )}
            {editando ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  aria-label="Nombre"
                  value={borrador}
                  maxLength={100}
                  autoFocus
                  onChange={(e) => setBorrador(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleGuardarNombre()
                    if (e.key === "Escape") handleCancelarNombre()
                  }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontFamily: NUNITO,
                    fontWeight: 800,
                    fontSize: 16,
                    color: C.navy,
                  }}
                />
                {(nombreVacio || errorNombre) && (
                  <div
                    role="alert"
                    style={{
                      background: C.redBg,
                      borderRadius: 12,
                      padding: "8px 12px",
                      color: C.red,
                      fontFamily: NUNITO,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {nombreVacio ? "Escribe tu nombre" : errorNombre}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleCancelarNombre}
                    style={{
                      flex: 1,
                      minHeight: 40,
                      border: "1.5px solid rgba(255,255,255,0.5)",
                      borderRadius: 12,
                      background: "transparent",
                      color: "white",
                      fontFamily: NUNITO,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGuardarNombre()}
                    disabled={!puedeGuardar}
                    style={{
                      flex: 1,
                      minHeight: 40,
                      border: "none",
                      borderRadius: 12,
                      background: "white",
                      color: C.navy,
                      fontFamily: NUNITO,
                      fontWeight: 800,
                      cursor: puedeGuardar ? "pointer" : "not-allowed",
                      opacity: puedeGuardar ? 1 : 0.6,
                    }}
                  >
                    {guardando ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: "100%" }}>
                <span
                  style={{
                    fontFamily: NUNITO,
                    fontWeight: 900,
                    fontSize: 22,
                    color: "white",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {nombre}
                </span>
                <button
                  type="button"
                  onClick={handleEditarNombre}
                  aria-label="Editar nombre"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "none",
                    borderRadius: 12,
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Icon name="edit" size={16} color="white" strokeWidth={2} />
                </button>
              </div>
            )}
            <span style={{ fontFamily: NUNITO, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              {email}
            </span>
          </div>
        </div>

        <div style={{ padding: "24px 16px 32px" }}>
          <SectionLabel>Mis viajes</SectionLabel>
          <button
            type="button"
            onClick={onVerArchivados}
            style={{
              width: "100%",
              background: "white",
              border: `1.5px solid ${C.border}`,
              borderRadius: 18,
              padding: "16px 20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 13,
                background: C.lightBlue,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="folder" size={22} color={C.blue} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontFamily: NUNITO, fontWeight: 800, color: C.navy, fontSize: 14 }}>Viajes archivados</div>
              <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, marginTop: 2 }}>
                Consulta o elimina los viajes que ya cerraste
              </div>
            </div>
            <Icon name="arrow_right" size={18} color={C.muted} strokeWidth={2} />
          </button>

          <SectionLabel>Cuenta y seguridad</SectionLabel>

          {error && (
            <div
              role="alert"
              style={{
                background: C.redBg,
                border: `1.5px solid ${C.red}55`,
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 12,
                color: C.red,
                fontFamily: NUNITO,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={cerrandoSesion}
            style={{
              width: "100%",
              background: "white",
              border: `1.5px solid ${C.red}30`,
              borderRadius: 18,
              padding: "16px 20px",
              cursor: cerrandoSesion ? "not-allowed" : "pointer",
              opacity: cerrandoSesion ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 13,
                background: C.redBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="logout" size={22} color={C.red} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontFamily: NUNITO, fontWeight: 800, color: C.red, fontSize: 14 }}>
                {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
              </div>
            </div>
          </button>
        </div>
      </div>

      {confirmando && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(13,31,60,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 22,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="perfil-cerrar-titulo"
            style={{
              width: "100%",
              maxWidth: 436,
              background: "white",
              borderRadius: 22,
              padding: 22,
              boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: C.redBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Icon name="logout" size={24} color={C.red} strokeWidth={2} />
            </div>
            <div id="perfil-cerrar-titulo">
              <Heading size={20}>¿Cerrar sesión?</Heading>
            </div>
            <div
              style={{
                fontFamily: NUNITO,
                color: C.muted,
                fontSize: 13,
                lineHeight: 1.5,
                marginTop: 8,
                marginBottom: 20,
              }}
            >
              Tendrás que volver a introducir tus datos para acceder a TravelWrap.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                style={{
                  flex: 1,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 13,
                  background: "white",
                  color: C.navy,
                  padding: 12,
                  fontFamily: NUNITO,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmar}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 13,
                  background: C.red,
                  color: "white",
                  padding: 12,
                  fontFamily: NUNITO,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {hojaFoto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(13,31,60,0.72)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Foto de perfil"
            style={{
              width: "100%",
              maxWidth: 480,
              boxSizing: "border-box",
              background: "white",
              borderRadius: "22px 22px 0 0",
              padding: "20px 16px calc(20px + env(safe-area-inset-bottom))",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <button type="button" onClick={handleElegirOtraFoto} style={estiloOpcionHoja(C.navy)}>
              Cambiar foto
            </button>
            <button type="button" onClick={handlePedirQuitarFoto} style={estiloOpcionHoja(C.red)}>
              Quitar foto
            </button>
            <button type="button" onClick={() => setHojaFoto(false)} style={estiloOpcionHoja(C.navy)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {confirmandoQuitar && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(13,31,60,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 22,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="perfil-quitar-titulo"
            style={{
              width: "100%",
              maxWidth: 436,
              background: "white",
              borderRadius: 22,
              padding: 22,
              boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div id="perfil-quitar-titulo">
              <Heading size={20}>¿Quitar tu foto de perfil?</Heading>
            </div>
            <div
              style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, lineHeight: 1.5, marginTop: 8, marginBottom: 20 }}
            >
              Se verá tu inicial. La foto se borra de verdad.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmandoQuitar(false)}
                style={{
                  flex: 1,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 13,
                  background: "white",
                  color: C.navy,
                  padding: 12,
                  fontFamily: NUNITO,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleQuitarFoto()}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 13,
                  background: C.red,
                  color: "white",
                  padding: 12,
                  fontFamily: NUNITO,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Quitar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
