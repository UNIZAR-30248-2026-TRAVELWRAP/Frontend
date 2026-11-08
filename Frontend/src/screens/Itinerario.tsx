import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react"
import Badge from "../components/Badge"
import DialogoConfirmacion from "../components/DialogoConfirmacion"
import BarraInferior, { ALTO_BARRA_INFERIOR, type SeccionViaje } from "../components/BarraInferior"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import Avatar from "../components/Avatar"
import {
  CATEGORIAS,
  eliminarActividad,
  iconoDeCategoria,
  listarActividades,
  type Actividad,
} from "../services/actividadesApi"
import { ApiError } from "../services/authApi"
import { obtenerRutaDelDia, type RutaDelDia } from "../services/rutasApi"
import { guardarItinerario, leerItinerario } from "../services/itinerarioGuardado"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro, diasDelItinerario, fechaDeHoy, formatearFechasActivo } from "../utils/formatoViaje"
import { estiloAlerta } from "../styles/formulario"

const MapaActividades = lazy(() => import("../components/MapaActividades"))

const ALTO_MAPA_CARGANDO = 220

const formatearDistancia = (metros: number) =>
  metros < 1000 ? `${Math.round(metros / 10) * 10} m` : `${(metros / 1000).toFixed(1).replace(".", ",")} km`

const formatearDuracion = (segundos: number) => {
  const minutos = Math.max(1, Math.round(segundos / 60))
  if (minutos < 60) return `${minutos} min`
  const resto = minutos % 60
  return resto === 0 ? `${Math.floor(minutos / 60)} h` : `${Math.floor(minutos / 60)} h ${String(resto).padStart(2, "0")} min`
}

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const avisoVacioStyle: CSSProperties = {
  fontFamily: NUNITO,
  color: C.muted,
  fontSize: 13,
  textAlign: "center",
  padding: "24px 0",
}

type ItinerarioProps = {
  viajeId: string
  tokenSesion: string
  diaInicial?: string
  onVolver?: () => void
  onAnadirActividad?: (fecha: string) => void
  onEditarActividad?: (actividad: Actividad) => void
  onCambiarSeccion?: (seccion: SeccionViaje) => void
}

export default function Itinerario({
  viajeId,
  tokenSesion,
  diaInicial = "",
  onVolver,
  onAnadirActividad,
  onEditarActividad,
  onCambiarSeccion,
}: ItinerarioProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [error, setError] = useState("")
  const [guardadoEn, setGuardadoEn] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)
  const [aEliminar, setAEliminar] = useState<Actividad | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState("")
  const [diaElegido, setDiaElegido] = useState(diaInicial)
  const [mapaAmpliado, setMapaAmpliado] = useState(false)
  const [rutaCargada, setRutaCargada] = useState<{ clave: string; datos: RutaDelDia | null } | null>(null)

  useEffect(() => {
    let vigente = true
    Promise.all([obtenerViaje(viajeId, tokenSesion), listarActividades(viajeId, tokenSesion)])
      .then(([datosViaje, lista]) => {
        if (!vigente) return
        setViaje(datosViaje)
        setActividades(lista.actividades)
        setGuardadoEn(null)
        setError("")
        guardarItinerario(viajeId, {
          viaje: datosViaje,
          actividades: lista.actividades,
          guardadoEn: new Date().toISOString(),
        })
      })
      .catch((e) => {
        if (!vigente) return
        const guardado = e instanceof ApiError && e.estado === 0 ? leerItinerario(viajeId) : null
        if (guardado) {
          setViaje(guardado.viaje)
          setActividades(guardado.actividades)
          setGuardadoEn(guardado.guardadoEn)
          setError("")
          return
        }
        setError(mensajeDeError(e))
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion, intento])

  useEffect(() => {
    const alVolverLaRed = () => setIntento((n) => n + 1)
    window.addEventListener("online", alVolverLaRed)
    return () => window.removeEventListener("online", alVolverLaRed)
  }, [])

  const dias = viaje
    ? diasDelItinerario(viaje.fecha_inicio, viaje.fecha_fin, actividades.map((actividad) => actividad.fecha))
    : []
  const handleEliminar = async () => {
    if (!aEliminar || !viaje) return
    setEliminando(true)
    setErrorEliminar("")
    try {
      await eliminarActividad(viajeId, aEliminar.id, tokenSesion)
      const restantes = actividades.filter((actividad) => actividad.id !== aEliminar.id)
      setActividades(restantes)
      guardarItinerario(viajeId, { viaje, actividades: restantes, guardadoEn: new Date().toISOString() })
      setAEliminar(null)
      setIntento((n) => n + 1)
    } catch (e) {
      setErrorEliminar(mensajeDeError(e))
    } finally {
      setEliminando(false)
    }
  }

  const hoy = fechaDeHoy()
  const diaPorDefecto = dias.find((d) => d.fecha === hoy)?.fecha ?? dias[0]?.fecha ?? ""
  const dia = dias.some((d) => d.fecha === diaElegido) ? diaElegido : diaPorDefecto
  const fueraDeLasFechas =
    viaje?.fecha_inicio && viaje.fecha_fin && dia !== "" ? dia < viaje.fecha_inicio || dia > viaje.fecha_fin : false
  const delDia = actividades.filter((actividad) => actividad.fecha === dia)
  const aMinutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))
  const solapadasCon = (actividad: (typeof delDia)[number]) =>
    delDia.filter(
      (otra) =>
        otra.id !== actividad.id &&
        !!actividad.hora_inicio &&
        !!actividad.hora_fin &&
        !!otra.hora_inicio &&
        !!otra.hora_fin &&
        aMinutos(actividad.hora_inicio) < aMinutos(otra.hora_fin) &&
        aMinutos(otra.hora_inicio) < aMinutos(actividad.hora_fin),
    )
  const puntosDelMapa = delDia.flatMap((actividad) =>
    actividad.latitud !== null && actividad.longitud !== null
      ? [
          {
            id: actividad.id,
            titulo: actividad.titulo,
            ubicacion: actividad.ubicacion_nombre,
            latitud: actividad.latitud,
            longitud: actividad.longitud,
          },
        ]
      : [],
  )
  const claveDeLaRuta = `${dia}|${JSON.stringify(puntosDelMapa.map((p) => [p.id, p.latitud, p.longitud]))}`
  const hayRutaQueCalcular = puntosDelMapa.length >= 2 && guardadoEn === null

  useEffect(() => {
    if (!hayRutaQueCalcular) return
    let vigente = true
    obtenerRutaDelDia(viajeId, dia, tokenSesion)
      .then((datos) => {
        if (vigente) setRutaCargada({ clave: claveDeLaRuta, datos })
      })
      .catch(() => {
        if (vigente) setRutaCargada({ clave: claveDeLaRuta, datos: null })
      })
    return () => {
      vigente = false
    }
  }, [hayRutaQueCalcular, claveDeLaRuta, viajeId, dia, tokenSesion])

  useEffect(() => {
    if (!mapaAmpliado) return
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setMapaAmpliado(false)
    }
    const desbordeAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", alPulsarTecla)
    return () => {
      window.removeEventListener("keydown", alPulsarTecla)
      document.body.style.overflow = desbordeAnterior
    }
  }, [mapaAmpliado])

  const rutaDelDia = hayRutaQueCalcular && rutaCargada?.clave === claveDeLaRuta ? rutaCargada : null
  const trazado = rutaDelDia?.datos?.ruta?.geometria ?? null
  const ordenSugerido =
    rutaDelDia?.datos && rutaDelDia.datos.ahorro_m >= 100
      ? rutaDelDia.datos.orden_sugerido
          .map((id) => rutaDelDia.datos?.puntos.find((punto) => punto.id === id)?.titulo)
          .filter((titulo): titulo is string => !!titulo)
      : []
  const activo = viaje?.estado === "activo"
  const puedeModificar = activo && !guardadoEn
  const indiceDeMiembro = (usuarioId: string | null) =>
    (viaje?.miembros ?? []).findIndex((miembro) => miembro.usuario_id === usuarioId)

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: ALTO_BARRA_INFERIOR + 24 }}>
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 22px", borderRadius: RADIUS.header }}>
          <div style={{ marginBottom: dias.length > 0 ? 16 : 0 }}>
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
                Mis Viajes
              </span>
            </button>
            <Heading size={22} color="white">
              Itinerario
            </Heading>
          </div>
          {dias.length > 0 && (
            <div role="group" aria-label="Día del itinerario" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {dias.map((d) => {
                const activa = dia === d.fecha
                return (
                  <button
                    type="button"
                    key={d.fecha}
                    aria-pressed={activa}
                    onClick={() => setDiaElegido(d.fecha)}
                    style={{
                      background: activa ? "white" : "rgba(255,255,255,0.18)",
                      color: activa ? C.blue : "rgba(255,255,255,0.85)",
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 16px",
                      fontFamily: NUNITO,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s",
                      flexShrink: 0,
                      boxShadow: activa ? "0 2px 10px rgba(0,0,0,0.15)" : "none",
                    }}
                  >
                    {d.texto}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          {error && (
            <div role="alert" style={{ ...estiloAlerta, marginBottom: 14 }}>
              No se ha podido cargar el viaje: {error}
            </div>
          )}

          {guardadoEn && (
            <div
              role="status"
              style={{
                background: C.lightAccent,
                border: `1.5px solid ${C.accent}40`,
                borderRadius: RADIUS.md,
                padding: "10px 12px",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontFamily: NUNITO,
                fontSize: 12,
                lineHeight: 1.5,
                color: C.navy,
                marginBottom: 14,
              }}
            >
              <Icon name="wifi" size={16} color={C.accent} strokeWidth={2} />
              <div style={{ flex: 1 }}>
                Sin conexión: se muestra lo último guardado (
                {new Date(guardadoEn).toLocaleString("es-ES", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                ). No puedes añadir actividades hasta que vuelva la conexión.
              </div>
              <button
                type="button"
                onClick={() => setIntento((n) => n + 1)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: C.blue,
                  fontFamily: NUNITO,
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                Reintentar
              </button>
            </div>
          )}

          {viaje && dias.length > 0 && (
            <div
              style={{
                background: "white",
                borderRadius: 22,
                overflow: "hidden",
                isolation: "isolate",
                boxShadow: SHADOWS.card,
                border: `1.5px solid ${C.border}`,
                marginBottom: 14,
                ...(mapaAmpliado
                  ? {
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100dvh",
                      zIndex: 50,
                      borderRadius: 0,
                      border: "none",
                      marginBottom: 0,
                      display: "flex",
                      flexDirection: "column",
                      boxSizing: "border-box",
                      paddingTop: "env(safe-area-inset-top)",
                    }
                  : {}),
              }}
            >
              <Suspense
                fallback={
                  <div
                    role="status"
                    style={{ ...avisoVacioStyle, height: ALTO_MAPA_CARGANDO, boxSizing: "border-box", background: C.lightBlue }}
                  >
                    Cargando mapa...
                  </div>
                }
              >
                <MapaActividades
                  puntos={puntosDelMapa}
                  trazado={trazado}
                  ampliado={mapaAmpliado}
                  alAlternarAmpliado={() => setMapaAmpliado((valor) => !valor)}
                />
              </Suspense>
              <div
                style={{
                  flexShrink: 0,
                  ...(mapaAmpliado
                    ? { maxHeight: "35%", overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom)" }
                    : {}),
                }}
              >
                <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, padding: "8px 14px" }}>
                  {puntosDelMapa.length > 0
                    ? `${puntosDelMapa.length} de ${delDia.length} ${delDia.length === 1 ? "actividad" : "actividades"} con ubicación en el mapa`
                    : "Ninguna actividad de este día tiene ubicación en el mapa. Al añadir o editar una actividad, busca su dirección con la lupa para verla aquí."}
                </div>
                {rutaDelDia?.datos?.ruta && (
                  <div style={{ fontFamily: NUNITO, color: C.navy, fontSize: 12, fontWeight: 700, padding: "0 14px 8px" }}>
                    Ruta a pie por calles: {formatearDistancia(rutaDelDia.datos.ruta.distancia_m)} ·{" "}
                    {formatearDuracion(rutaDelDia.datos.ruta.duracion_s)}
                  </div>
                )}
                {ordenSugerido.length > 0 && rutaDelDia?.datos && (
                  <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, padding: "0 14px 8px", lineHeight: 1.4 }}>
                    Orden más corto: {ordenSugerido.map((titulo) => `«${titulo}»`).join(" → ")} (unos{" "}
                    {formatearDistancia(rutaDelDia.datos.ahorro_m)} menos en línea recta)
                  </div>
                )}
                {rutaDelDia && rutaDelDia.datos === null && (
                  <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, padding: "0 14px 8px" }}>
                    No se ha podido calcular la ruta por calles; se muestra una línea recta.
                  </div>
                )}
              </div>
            </div>
          )}

          {viaje && activo && !guardadoEn && (
            <button
              type="button"
              onClick={() => onAnadirActividad?.(dia)}
              style={{
                width: "100%",
                background: "white",
                color: C.blue,
                border: `1.5px dashed ${C.blue}`,
                borderRadius: 14,
                padding: 12,
                fontFamily: NUNITO,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Icon name="plus" size={16} color={C.blue} strokeWidth={2.5} />
              Añadir Actividad
            </button>
          )}

          {viaje && dias.length === 0 && (
            <div style={avisoVacioStyle}>
              Todavía no hay actividades ni fechas en este viaje. Añade una actividad y aparecerá aquí por día.
            </div>
          )}

          {dias.length > 0 && (
            <>
              <SectionLabel>Agenda del día</SectionLabel>
              {fueraDeLasFechas && (
                <div
                  role="status"
                  style={{
                    background: C.lightAccent,
                    border: `1.5px solid ${C.accent}40`,
                    borderRadius: RADIUS.md,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontFamily: NUNITO,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: C.navy,
                    marginBottom: 14,
                  }}
                >
                  <Icon name="info" size={16} color={C.accent} strokeWidth={2} />
                  <span>
                    Este día queda fuera de las fechas del viaje ({formatearFechasActivo(viaje?.fecha_inicio ?? null, viaje?.fecha_fin ?? null)}).
                  </span>
                </div>
              )}
              {delDia.length === 0 ? (
                <div style={avisoVacioStyle}>No hay actividades este día.</div>
              ) : (
                <div role="list" aria-label="Agenda del día" style={{ position: "relative", paddingBottom: 28 }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 20,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: `linear-gradient(to bottom, ${C.blue}, ${C.border})`,
                    }}
                  />
                  {delDia.map((actividad, indice) => {
                    const primera = indice === 0
                    const solapadas = solapadasCon(actividad)
                    return (
                      <div
                        role="listitem"
                        key={actividad.id}
                        style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}
                      >
                        <div
                          role={actividad.categoria ? "img" : undefined}
                          aria-label={CATEGORIAS.find((c) => c.valor === actividad.categoria)?.texto}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: primera ? C.accent : "white",
                            border: `2.5px solid ${primera ? C.accent : C.blue}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            zIndex: 1,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                          }}
                        >
                          <Icon
                            name={iconoDeCategoria(actividad.categoria)}
                            size={18}
                            color={primera ? "white" : C.blue}
                            strokeWidth={1.8}
                          />
                        </div>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            background: "white",
                            borderRadius: 16,
                            padding: "12px 14px",
                            boxShadow: SHADOWS.card,
                            border: `1.5px solid ${primera ? `${C.accent}50` : C.border}`,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: NUNITO, color: C.navy, fontSize: 13, fontWeight: 800, overflowWrap: "anywhere" }}>
                                {actividad.titulo}
                              </div>
                              {actividad.ubicacion_nombre && (
                                <div
                                  style={{
                                    fontFamily: NUNITO,
                                    color: C.muted,
                                    fontSize: 11,
                                    marginTop: 3,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <Icon name="pin" size={11} color={C.muted} strokeWidth={2} />
                                  <span style={{ overflowWrap: "anywhere" }}>{actividad.ubicacion_nombre}</span>
                                </div>
                              )}
                            </div>
                            {viaje && indiceDeMiembro(actividad.creado_por) >= 0 && (
                              <div
                                role="img"
                                aria-label={`Añadida por ${viaje.miembros[indiceDeMiembro(actividad.creado_por)].nombre ?? "un viajero"}`}
                              >
                                <Avatar
                                  member={aMiembro(
                                    viaje.miembros[indiceDeMiembro(actividad.creado_por)].nombre,
                                    indiceDeMiembro(actividad.creado_por),
                                  )}
                                  size={26}
                                  showBorder={false}
                                />
                              </div>
                            )}
                          </div>
                          {solapadas.length > 0 && (
                            <div
                              role="note"
                              style={{
                                fontFamily: NUNITO,
                                color: "#B7531A",
                                fontSize: 12,
                                fontWeight: 700,
                                marginTop: 8,
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 5,
                                lineHeight: 1.4,
                              }}
                            >
                              <span style={{ marginTop: 1, flexShrink: 0, display: "flex" }}>
                                <Icon name="info" size={13} color="#B7531A" strokeWidth={2} />
                              </span>
                              <span style={{ overflowWrap: "anywhere" }}>
                                Se solapa con {solapadas.map((otra) => `«${otra.titulo}»`).join(", ")}
                              </span>
                            </div>
                          )}
                          {(actividad.hora_inicio || puedeModificar) && (
                            <div
                              style={{
                                marginTop: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <div>
                                {actividad.hora_inicio && (
                                  <Badge bg={primera ? C.lightAccent : C.lightBlue} color={primera ? C.accent : C.blue}>
                                    <Icon name="clock" size={11} color={primera ? C.accent : C.blue} strokeWidth={2} />
                                    {actividad.hora_inicio.slice(0, 5)}
                                    {actividad.hora_fin ? ` – ${actividad.hora_fin.slice(0, 5)}` : ""} h
                                  </Badge>
                                )}
                              </div>
                              {puedeModificar && (
                                <div style={{ display: "flex", gap: 7, marginLeft: "auto" }}>
                                  <button
                                    type="button"
                                    onClick={() => onEditarActividad?.(actividad)}
                                    aria-label={`Editar ${actividad.titulo}`}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 8,
                                      border: "none",
                                      background: C.lightBlue,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Icon name="edit" size={13} color={C.blue} strokeWidth={2} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setErrorEliminar("")
                                      setAEliminar(actividad)
                                    }}
                                    aria-label={`Eliminar ${actividad.titulo}`}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 8,
                                      border: "none",
                                      background: C.redBg,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Icon name="trash" size={13} color={C.red} strokeWidth={2} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <BarraInferior activa="itinerario" onCambiar={onCambiarSeccion} />

      {aEliminar && (
        <DialogoConfirmacion
          titulo="¿Eliminar esta actividad?"
          icono="trash"
          color={C.red}
          colorFondo={C.redBg}
          textoConfirmar="Eliminar actividad"
          textoConfirmando="Eliminando..."
          ocupado={eliminando}
          error={errorEliminar}
          onConfirmar={handleEliminar}
          onCancelar={() => setAEliminar(null)}
        >
          Se eliminará <strong style={{ color: C.navy }}>{aEliminar.titulo}</strong> del itinerario para todos los
          viajeros. Esta acción no se puede deshacer.
        </DialogoConfirmacion>
      )}
    </div>
  )
}
