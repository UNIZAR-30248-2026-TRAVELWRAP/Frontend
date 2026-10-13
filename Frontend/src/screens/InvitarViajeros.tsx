import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { QRCodeSVG } from "qrcode.react"
import { ApiError } from "../services/authApi"
import { obtenerEnlaceInvitacion } from "../services/invitacionesApi"

// ─── Tokens de diseño ──────────────────────────────────
const C = {
  navy: "#1A365D",
  blue: "#2B6CB0",
  bg: "#F7FAFC",
  muted: "#718096",
  border: "#E2E8F0",
  green: "#276749",
  greenBg: "#F0FFF4",
  red: "#C53030",
}

const NUNITO = "'Nunito', sans-serif"

// ─── Tipos y datos de ejemplo ─────────────────────────────────────────────────
export type Miembro = {
  name: string
  initial: string
  color: string
}

const MIEMBROS_DEMO: Miembro[] = [
  { name: "Daniel", initial: "D", color: "#2B6CB0" },
  { name: "Berta", initial: "B", color: "#276749" },
  { name: "Adriana", initial: "A", color: "#DD6B20" },
]

// ─── Iconos (solo los que usa esta pantalla) ──────────────────────────────────
type IconName = "arrow_left" | "search" | "close" | "check"

function Icon({
  name,
  size = 20,
  color = "currentColor",
  strokeWidth = 1.8,
}: {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}) {
  const paths: Record<IconName, ReactNode> = {
    arrow_left: <polyline points="15 18 9 12 15 6" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    close: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

// ─── Componentes base ─────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.2,
        color: C.muted,
        fontFamily: NUNITO,
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function Badge({
  children,
  bg,
  color,
}: {
  children: ReactNode
  bg: string
  color: string
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: bg,
        color,
        borderRadius: 7,
        padding: "3px 9px",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: NUNITO,
      }}
    >
      {children}
    </div>
  )
}

function Avatar({ member, size = 38 }: { member: Miembro; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: member.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: "white",
          fontSize: size * 0.36,
          fontWeight: 800,
          fontFamily: NUNITO,
          lineHeight: 1,
        }}
      >
        {member.initial}
      </span>
    </div>
  )
}

const cardStyle: CSSProperties = {
  background: "white",
  borderRadius: 18,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  border: `1.5px solid ${C.border}`,
}

// ─── Pantalla: Invitar viajeros ───────────────────────────────────────────────
type InvitarViajerosProps = {
  tripName?: string
  members?: Miembro[]
  // Con viajeId y tokenSesion el enlace se pide al backend; si no, se usa inviteLink (datos de ejemplo)
  viajeId?: string
  tokenSesion?: string
  inviteLink?: string
  onBack?: () => void
}

export default function InvitarViajeros({
  tripName = "Roma 2025",
  members = MIEMBROS_DEMO,
  viajeId,
  tokenSesion,
  inviteLink = "https://travelwrap.app/unirse/roma2025",
  onBack,
}: InvitarViajerosProps) {
  const [copied, setCopied] = useState(false)
  const [qrAmpliado, setQrAmpliado] = useState(false)
  const [enlaceDelViaje, setEnlaceDelViaje] = useState("")
  const [errorEnlace, setErrorEnlace] = useState("")

  const pideEnlaceAlBackend = Boolean(viajeId && tokenSesion)
  const enlace = pideEnlaceAlBackend ? enlaceDelViaje : inviteLink

  useEffect(() => {
    if (!viajeId || !tokenSesion) return
    let vigente = true
    obtenerEnlaceInvitacion(viajeId, tokenSesion)
      .then((invitacion) => {
        if (vigente) setEnlaceDelViaje(invitacion.enlace)
      })
      .catch((e) => {
        if (vigente) setErrorEnlace(e instanceof ApiError ? e.message : "Ha ocurrido un error")
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  useEffect(() => {
    if (!qrAmpliado) return
    const cerrarConEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQrAmpliado(false)
    }
    window.addEventListener("keydown", cerrarConEscape)
    return () => window.removeEventListener("keydown", cerrarConEscape)
  }, [qrAmpliado])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(enlace)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (errorEnlace) {
    return (
      <div role="alert" style={{ padding: 24, fontFamily: NUNITO, color: C.red, fontWeight: 700 }}>
        {errorEnlace}
      </div>
    )
  }
  if (!enlace) return null

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Cabecera */}
        <div
          style={{
            background: `linear-gradient(145deg, ${C.navy}, ${C.blue})`,
            padding: "20px 20px 24px",
            borderRadius: "0 0 28px 28px",
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
            <div>
              <SectionLabel>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>{tripName}</span>
              </SectionLabel>
              <div
                style={{
                  fontFamily: NUNITO,
                  fontSize: 22,
                  fontWeight: 800,
                  color: "white",
                  lineHeight: 1.15,
                }}
              >
                Invitar Viajeros
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 16px 32px" }}>
          {/* Miembros actuales */}
          <SectionLabel>Miembros actuales</SectionLabel>
          <div style={{ ...cardStyle, overflow: "hidden", marginBottom: 22 }}>
            {members.map((m, i) => (
              <div
                key={m.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 16px",
                  borderBottom:
                    i < members.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <Avatar member={m} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: NUNITO,
                      color: C.navy,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {m.name}
                  </div>
                  <div
                    style={{
                      fontFamily: NUNITO,
                      color: C.muted,
                      fontSize: 11,
                      marginTop: 1,
                    }}
                  >
                    Miembro activo
                  </div>
                </div>
                <Badge bg={C.greenBg} color={C.green}>
                  Unido
                </Badge>
              </div>
            ))}
          </div>

          {/* Compartir enlace */}
          <SectionLabel>Compartir enlace de invitacion</SectionLabel>
          <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <button
                type="button"
                onClick={() => setQrAmpliado(true)}
                aria-label="Ampliar codigo QR"
                style={{
                  position: "relative",
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  background: "white",
                  border: `1.5px solid ${C.border}`,
                  padding: 6,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <QRCodeSVG
                  value={enlace}
                  fgColor={C.navy}
                  style={{ display: "block", width: "100%", height: "100%" }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: -7,
                    bottom: -7,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: C.blue,
                    border: "2px solid white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="search" size={13} color="white" strokeWidth={2.6} />
                </span>
              </button>
              <div>
                <div
                  style={{
                    fontFamily: NUNITO,
                    color: C.navy,
                    fontSize: 13,
                    fontWeight: 800,
                    marginBottom: 4,
                  }}
                >
                  Codigo QR del viaje
                </div>
                <div
                  style={{
                    fontFamily: NUNITO,
                    color: C.muted,
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Escanea el codigo para unirte directamente al viaje {tripName}.
                </div>
              </div>
            </div>

            <div
              style={{
                background: C.bg,
                borderRadius: 12,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: NUNITO,
                  color: C.muted,
                  fontSize: 12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {enlace}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Enlace copiado" : "Copiar enlace"}
                style={{
                  background: copied ? C.greenBg : C.blue,
                  color: "white",
                  border: "none",
                  borderRadius: 9,
                  minWidth: 60,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "5px 12px",
                  fontFamily: NUNITO,
                  fontWeight: 800,
                  fontSize: 11,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {copied ? (
                  <Icon name="check" size={16} color={C.green} strokeWidth={3} />
                ) : (
                  "Copiar"
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            style={{
              width: "100%",
              background: C.navy,
              color: "white",
              border: "none",
              borderRadius: 16,
              padding: 15,
              fontFamily: NUNITO,
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Listo
          </button>
        </div>
      </div>

      {/* Popup con el QR ampliado */}
      {qrAmpliado && (
        <div
          onClick={() => setQrAmpliado(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26,54,93,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 50,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Codigo QR del viaje"
            onClick={(e) => e.stopPropagation()}
            style={{
              ...cardStyle,
              position: "relative",
              width: "100%",
              maxWidth: 340,
              padding: "22px 24px 24px",
              textAlign: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setQrAmpliado(false)}
              aria-label="Cerrar"
              autoFocus
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: C.bg,
                border: "none",
                borderRadius: 10,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Icon name="close" size={16} color={C.navy} strokeWidth={2.5} />
            </button>
            <div
              style={{
                fontFamily: NUNITO,
                color: C.navy,
                fontSize: 17,
                fontWeight: 800,
                padding: "0 32px",
                marginBottom: 16,
              }}
            >
              {tripName}
            </div>
            <QRCodeSVG
              value={enlace}
              size={280}
              fgColor={C.navy}
              marginSize={2}
              style={{ display: "block", width: "100%", height: "auto" }}
            />
            <div
              style={{
                fontFamily: NUNITO,
                color: C.muted,
                fontSize: 12,
                lineHeight: 1.5,
                marginTop: 14,
              }}
            >
              Escanea el codigo para unirte al viaje.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
