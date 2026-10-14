import { useEffect, useState, type CSSProperties } from "react"
import Avatar, { type Miembro } from "../components/Avatar"
import AvatarStack from "../components/AvatarStack"
import Badge from "../components/Badge"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import { ApiError } from "../services/authApi"
import { listarViajes, type ViajeDelUsuario } from "../services/viajesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"

// ─── Tipos de las tarjetas ────────────────────────────────────────────────────
type TarjetaActiva = {
  tipo: "activo"
  id: string
  nombre: string
  fechas: string
  presupuesto: string
  miembros: Miembro[]
}

type TarjetaPendiente = {
  tipo: "pendiente"
  id: string
  nombre: string
}

type TarjetaAnterior = {
  id: string
  nombre: string
  fechas: string
  viajeros: number
  importe: string
  icono: string
}

// ─── Datos de ejemplo (se muestran junto a los reales mientras se desarrolla) ─
const VIAJE_ACTIVO_DEMO: TarjetaActiva = {
  tipo: "activo",
  id: "roma-2025",
  nombre: "Roma 2025",
  fechas: "12 – 15 may · 4 días",
  presupuesto: "850 €",
  miembros: [
    { name: "Daniel", initial: "D", color: "#2B6CB0" },
    { name: "Berta", initial: "B", color: "#276749" },
    { name: "Adriana", initial: "A", color: "#DD6B20" },
  ],
}

const VIAJES_ANTERIORES_DEMO: TarjetaAnterior[] = [
  { id: "paris-2024", nombre: "Paris 2024", fechas: "20–24 jun 2024", viajeros: 4, importe: "1.240 €", icono: "map" },
  { id: "lisboa-2023", nombre: "Lisboa 2023", fechas: "8–11 sep 2023", viajeros: 3, importe: "620 €", icono: "route" },
  { id: "amsterdam-2022", nombre: "Amsterdam 2022", fechas: "2–5 dic 2022", viajeros: 5, importe: "980 €", icono: "flight" },
]

// ─── Formato de los datos reales ──────────────────────────────────────────────
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const COLORES_MIEMBROS = [C.blue, C.green, C.accent, "#805AD5", C.red]
const ICONOS_ANTERIORES = ["map", "route", "flight"]
const SIMBOLOS_MONEDA: Record<string, string> = { EUR: "€" }

// "2027-05-12" → { dia: 12, mes: 4, anio: 2027 }, sin pasar por zonas horarias
const leerFecha = (texto: string) => {
  const [anio, mes, dia] = texto.split("-").map(Number)
  return { anio, mes: mes - 1, dia }
}

const diasEntre = (inicio: string, fin: string) => {
  const a = leerFecha(inicio)
  const b = leerFecha(fin)
  return Math.round((Date.UTC(b.anio, b.mes, b.dia) - Date.UTC(a.anio, a.mes, a.dia)) / 86400000) + 1
}

const fechaCorta = (texto: string, conAnio = false) => {
  const { dia, mes, anio } = leerFecha(texto)
  return `${dia} ${MESES[mes]}${conAnio ? ` ${anio}` : ""}`
}

// Viaje activo: "12 – 15 may · 4 días"
const formatearFechasActivo = (inicio: string | null, fin: string | null) => {
  if (!inicio && !fin) return "Fechas por confirmar"
  if (!inicio || !fin) return fechaCorta((inicio ?? fin) as string, true)
  const a = leerFecha(inicio)
  const b = leerFecha(fin)
  const rango =
    a.mes === b.mes && a.anio === b.anio
      ? `${a.dia} – ${b.dia} ${MESES[b.mes]}`
      : `${fechaCorta(inicio)} – ${fechaCorta(fin)}`
  const dias = diasEntre(inicio, fin)
  return `${rango} · ${dias} ${dias === 1 ? "día" : "días"}`
}

// Viaje anterior: "20–24 jun 2024"
const formatearFechasAnterior = (inicio: string | null, fin: string | null) => {
  if (!inicio && !fin) return "Fechas sin indicar"
  if (!inicio || !fin) return fechaCorta((inicio ?? fin) as string, true)
  const a = leerFecha(inicio)
  const b = leerFecha(fin)
  if (a.anio !== b.anio) return `${fechaCorta(inicio, true)} – ${fechaCorta(fin, true)}`
  if (a.mes !== b.mes) return `${fechaCorta(inicio)} – ${fechaCorta(fin)} ${b.anio}`
  return `${a.dia}–${b.dia} ${MESES[b.mes]} ${b.anio}`
}

// 1240 → "1.240 €"
const formatearImporte = (cantidad: number, moneda = "EUR") => {
  const entero = Math.round(cantidad)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${entero} ${SIMBOLOS_MONEDA[moneda] ?? moneda}`
}

const aMiembro = (nombre: string | null, indice: number): Miembro => {
  const texto = nombre?.trim() || "?"
  return {
    name: texto,
    initial: texto.charAt(0).toUpperCase(),
    color: COLORES_MIEMBROS[indice % COLORES_MIEMBROS.length],
  }
}

const aTarjetaActiva = (viaje: ViajeDelUsuario): TarjetaActiva | TarjetaPendiente =>
  viaje.pendiente_destino
    ? { tipo: "pendiente", id: viaje.id, nombre: viaje.nombre }
    : {
        tipo: "activo",
        id: viaje.id,
        nombre: viaje.nombre,
        fechas: formatearFechasActivo(viaje.fecha_inicio, viaje.fecha_fin),
        presupuesto: formatearImporte(viaje.presupuesto, viaje.moneda),
        miembros: viaje.miembros.map((m, i) => aMiembro(m.nombre, i)),
      }

const aTarjetaAnterior = (viaje: ViajeDelUsuario, indice: number): TarjetaAnterior => ({
  id: viaje.id,
  nombre: viaje.nombre,
  fechas: formatearFechasAnterior(viaje.fecha_inicio, viaje.fecha_fin),
  viajeros: viaje.miembros.length,
  importe: formatearImporte(viaje.presupuesto, viaje.moneda),
  icono: ICONOS_ANTERIORES[indice % ICONOS_ANTERIORES.length],
})

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
  // Con el token de sesión se cargan los viajes reales del usuario
  tokenSesion?: string
  // De momento los viajes de ejemplo se muestran junto a los reales
  mostrarEjemplos?: boolean
  onSelectTrip?: (id: string) => void
  onSelectPendingTrip?: (id: string) => void
  onCreateTrip?: () => void
  onViewPastTrip?: (id: string) => void
  onViewPerfil?: () => void
}

export default function MisViajes({
  nombreUsuario = "Adriana",
  emailUsuario,
  tokenSesion,
  mostrarEjemplos = true,
  onSelectTrip,
  onSelectPendingTrip,
  onCreateTrip,
  onViewPastTrip,
  onViewPerfil,
}: MisViajesProps) {
  const [viajes, setViajes] = useState<ViajeDelUsuario[]>([])
  const [cargando, setCargando] = useState(Boolean(tokenSesion))
  const [error, setError] = useState("")

  useEffect(() => {
    if (!tokenSesion) return
    let vigente = true
    listarViajes(tokenSesion)
      .then((respuesta) => {
        if (vigente) setViajes(respuesta.viajes)
      })
      .catch((e) => {
        if (vigente) setError(e instanceof ApiError ? e.message : "Ha ocurrido un error")
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [tokenSesion])

  const activos = [
    ...viajes.filter((v) => v.estado === "activo").map(aTarjetaActiva),
    ...(mostrarEjemplos ? [VIAJE_ACTIVO_DEMO] : []),
  ]
  const anteriores = [
    ...viajes.filter((v) => v.estado === "finalizado").map(aTarjetaAnterior),
    ...(mostrarEjemplos ? VIAJES_ANTERIORES_DEMO : []),
  ]
  const sinViajes = !cargando && !error && activos.length === 0 && anteriores.length === 0

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
              No se han podido cargar tus viajes: {error}
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
                marginBottom: 16,
              }}
            >
              <div style={{ fontFamily: NUNITO, color: C.navy, fontSize: 16, fontWeight: 800 }}>
                Aún no tienes viajes
              </div>
              <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                Crea tu primer viaje o únete a uno con el enlace de invitación que te pase tu grupo.
              </div>
            </div>
          )}

          {/* Viajes activos: con destino (azul) o pendientes de destino (verde) */}
          {activos.length > 0 && <SectionLabel>{activos.length === 1 ? "Viaje activo" : "Viajes activos"}</SectionLabel>}
          {activos.map((viaje) =>
            viaje.tipo === "activo" ? (
              <button
                type="button"
                key={viaje.id}
                onClick={() => onSelectTrip?.(viaje.id)}
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
                      {viaje.nombre}
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
                      {viaje.fechas}
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
                  <AvatarStack members={viaje.miembros} size={30} />
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
                      PRESUPUESTO
                    </div>
                    <div style={{ fontFamily: NUNITO, fontWeight: 900, color: "white", fontSize: 20 }}>
                      {viaje.presupuesto}
                    </div>
                  </div>
                </div>
              </button>
            ) : (
              <button
                type="button"
                key={viaje.id}
                onClick={() => onSelectPendingTrip?.(viaje.id)}
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
                    {viaje.nombre}
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
            ),
          )}

          {/* Viajes anteriores: los finalizados (los archivados no se muestran aquí) */}
          {anteriores.length > 0 && (
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
                {anteriores.map((viaje) => (
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
                          {viaje.viajeros} {viaje.viajeros === 1 ? "viajero" : "viajeros"}
                        </Badge>
                        <Badge bg={C.bg} color={C.muted}>
                          {viaje.importe}
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
