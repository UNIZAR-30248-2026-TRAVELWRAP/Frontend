import type { CSSProperties } from "react"
import Avatar, { type Miembro } from "../components/Avatar"
import AvatarStack from "../components/AvatarStack"
import Badge from "../components/Badge"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"

// ─── Tipos y datos de ejemplo ─────────────────────────────────────────────────
export type ViajeActivo = {
  id: string
  nombre: string
  fechas: string
  gastado: string
  miembros: Miembro[]
}

export type ViajePendiente = {
  id: string
  nombre: string
}

export type ViajeAnterior = {
  id: string
  nombre: string
  fechas: string
  viajeros: number
  gastado: string
  icono: string
}

const VIAJE_ACTIVO_DEMO: ViajeActivo = {
  id: "roma-2025",
  nombre: "Roma 2025",
  fechas: "12 – 15 Mayo · 3 días",
  gastado: "623 €",
  miembros: [
    { name: "Daniel", initial: "D", color: "#2B6CB0" },
    { name: "Berta", initial: "B", color: "#276749" },
    { name: "Adriana", initial: "A", color: "#DD6B20" },
  ],
}

const VIAJES_ANTERIORES_DEMO: ViajeAnterior[] = [
  { id: "paris-2024", nombre: "Paris 2024", fechas: "20–24 Jun 2024", viajeros: 4, gastado: "1.240 €", icono: "map" },
  { id: "lisboa-2023", nombre: "Lisboa 2023", fechas: "8–11 Sep 2023", viajeros: 3, gastado: "620 €", icono: "route" },
  { id: "amsterdam-2022", nombre: "Amsterdam 2022", fechas: "2–5 Dic 2022", viajeros: 5, gastado: "980 €", icono: "flight" },
]

// Las tarjetas son botones: se les quita el estilo propio para que se vean como en el prototipo
const tarjetaBotonStyle: CSSProperties = {
  width: "100%",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  fontFamily: NUNITO,
}

// ─── Pantalla: Mis viajes ─────────────────────────────────────────────────────
type MisViajesProps = {
  nombreUsuario?: string
  emailUsuario?: string
  viajeActivo?: ViajeActivo | null
  viajePendiente?: ViajePendiente | null
  viajesAnteriores?: ViajeAnterior[]
  onSelectTrip?: (id: string) => void
  onSelectPendingTrip?: (id: string) => void
  onCreateTrip?: () => void
  onViewPastTrip?: (id: string) => void
  onViewPerfil?: () => void
}

export default function MisViajes({
  nombreUsuario = "Adriana",
  emailUsuario,
  viajeActivo = VIAJE_ACTIVO_DEMO,
  viajePendiente = null,
  viajesAnteriores = VIAJES_ANTERIORES_DEMO,
  onSelectTrip,
  onSelectPendingTrip,
  onCreateTrip,
  onViewPastTrip,
  onViewPerfil,
}: MisViajesProps) {
  const usuario: Miembro = {
    name: nombreUsuario,
    initial: nombreUsuario.charAt(0).toUpperCase(),
    color: C.accent,
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Cabecera */}
        <div
          style={{
            background: GRADIENTS.header,
            padding: "20px 20px 28px",
            borderRadius: RADIUS.header,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 13,
                  fontFamily: NUNITO,
                  fontWeight: 600,
                }}
              >
                Hola, {nombreUsuario}
              </div>
              <Heading size={26} color="white">
                Mis Viajes
              </Heading>
            </div>
            <button
              type="button"
              onClick={onViewPerfil}
              aria-label={`Perfil de ${emailUsuario ?? nombreUsuario}`}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              <Avatar member={usuario} size={42} showBorder={false} />
            </button>
          </div>
        </div>

        <div style={{ padding: "20px 16px 0" }}>
          {/* Viaje activo */}
          {viajeActivo && (
            <>
              <SectionLabel>Viaje activo</SectionLabel>
              <button
                type="button"
                onClick={() => onSelectTrip?.(viajeActivo.id)}
                style={{
                  ...tarjetaBotonStyle,
                  display: "block",
                  background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
                  borderRadius: RADIUS.xl,
                  padding: 20,
                  marginBottom: 16,
                  boxShadow: "0 10px 30px rgba(26,54,93,0.35)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <Badge bg="rgba(255,255,255,0.2)" color="white">
                      En curso
                    </Badge>
                    <div
                      style={{
                        fontFamily: NUNITO,
                        fontSize: 24,
                        fontWeight: 900,
                        color: "white",
                        marginTop: 8,
                      }}
                    >
                      {viajeActivo.nombre}
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.75)",
                        fontSize: 13,
                        fontFamily: NUNITO,
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Icon name="calendar" size={13} color="rgba(255,255,255,0.75)" strokeWidth={2} />
                      {viajeActivo.fechas}
                    </div>
                  </div>
                  <Icon name="arrow_right" size={22} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <AvatarStack members={viajeActivo.miembros} size={30} />
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.55)",
                        fontSize: 10,
                        fontFamily: NUNITO,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                      }}
                    >
                      GASTADO
                    </div>
                    <div style={{ fontFamily: NUNITO, fontWeight: 900, color: "white", fontSize: 20 }}>
                      {viajeActivo.gastado}
                    </div>
                  </div>
                </div>
              </button>
            </>
          )}

          {/* Viaje pendiente de elegir destino */}
          {viajePendiente && (
            <button
              type="button"
              onClick={() => onSelectPendingTrip?.(viajePendiente.id)}
              style={{
                ...tarjetaBotonStyle,
                background: GRADIENTS.success,
                borderRadius: RADIUS.xl,
                padding: "18px 20px",
                marginBottom: 14,
                boxShadow: "0 8px 24px rgba(39,103,73,0.28)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="vote" size={22} color="white" strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <Badge bg="rgba(255,255,255,0.25)" color="white">
                  Pendiente de destino
                </Badge>
                <div
                  style={{
                    fontFamily: NUNITO,
                    fontSize: 18,
                    fontWeight: 900,
                    color: "white",
                    marginTop: 6,
                  }}
                >
                  {viajePendiente.nombre}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 12,
                    fontFamily: NUNITO,
                    marginTop: 3,
                  }}
                >
                  Elige el destino para desbloquear el viaje
                </div>
              </div>
              <Icon name="arrow_right" size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            </button>
          )}

          <button
            type="button"
            onClick={onCreateTrip}
            style={{
              width: "100%",
              background: "white",
              color: C.blue,
              border: `2px dashed ${C.blue}`,
              borderRadius: RADIUS.lg,
              padding: 16,
              fontFamily: NUNITO,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Icon name="plus" size={18} color={C.blue} strokeWidth={2.5} />
            Crear nuevo viaje
          </button>

          {/* Viajes anteriores */}
          {viajesAnteriores.length > 0 && (
            <>
              <SectionLabel>Viajes anteriores</SectionLabel>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  paddingBottom: 32,
                }}
              >
                {viajesAnteriores.map((viaje) => (
                  <button
                    type="button"
                    key={viaje.id}
                    onClick={() => onViewPastTrip?.(viaje.id)}
                    style={{
                      ...tarjetaBotonStyle,
                      background: "white",
                      borderRadius: RADIUS.lg,
                      padding: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      boxShadow: SHADOWS.card,
                      border: `1.5px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: C.lightBlue,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={viaje.icono} size={22} color={C.blue} strokeWidth={1.6} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: NUNITO, color: C.navy, fontSize: 14, fontWeight: 800 }}>
                        {viaje.nombre}
                      </div>
                      <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, marginTop: 2 }}>
                        {viaje.fechas}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <Badge bg={C.bg} color={C.muted}>
                          {viaje.viajeros} viajeros
                        </Badge>
                        <Badge bg={C.bg} color={C.muted}>
                          {viaje.gastado}
                        </Badge>
                      </div>
                    </div>
                    <Icon name="arrow_right" size={18} color={C.muted} strokeWidth={2} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
