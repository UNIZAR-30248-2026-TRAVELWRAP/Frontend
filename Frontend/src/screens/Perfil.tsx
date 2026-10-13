import { useState } from "react"
import Avatar from "../components/Avatar"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import { C, NUNITO } from "../styles/tokens"

type PerfilProps = {
  nombre: string
  email: string
  onVolver?: () => void
  onCerrarSesion?: () => void
  cerrandoSesion?: boolean
  error?: string
}

export default function Perfil({
  nombre,
  email,
  onVolver,
  onCerrarSesion,
  cerrandoSesion = false,
  error,
}: PerfilProps) {
  const [confirmando, setConfirmando] = useState(false)

  const usuario = { name: nombre, initial: nombre.charAt(0).toUpperCase(), color: C.accent }

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
            borderRadius: 25,
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
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.4)",
                overflow: "hidden",
              }}
            >
              <Avatar member={usuario} size={82} showBorder={false} />
            </div>
            <span style={{ fontFamily: NUNITO, fontWeight: 900, fontSize: 22, color: "white" }}>
              {nombre}
            </span>
            <span style={{ fontFamily: NUNITO, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              {email}
            </span>
          </div>
        </div>

        <div style={{ padding: "24px 16px 32px" }}>
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
    </div>
  )
}
