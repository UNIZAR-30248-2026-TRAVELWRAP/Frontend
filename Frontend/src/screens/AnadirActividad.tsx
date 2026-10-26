import { useEffect, useState, type CSSProperties, type FormEvent } from "react"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import {
  CATEGORIAS,
  crearActividad,
  editarActividad,
  listarActividades,
  type Actividad,
  type Categoria,
  type CambiosActividad,
  type NuevaActividad,
  type ResultadoDireccion,
} from "../services/actividadesApi"
import { ApiError } from "../services/authApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { diasDelItinerario } from "../utils/formatoViaje"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const inputStyle: CSSProperties = {
  width: "100%",
  background: "white",
  border: `1.5px solid ${C.border}`,
  borderRadius: 14,
  padding: "13px 16px",
  fontFamily: NUNITO,
  fontSize: 16,
  color: C.navy,
  outline: "none",
  boxSizing: "border-box",
}

const labelStyle: CSSProperties = {
  fontFamily: NUNITO,
  fontSize: 11,
  fontWeight: 700,
  color: C.muted,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  marginBottom: 6,
  display: "block",
}

const alertaStyle: CSSProperties = {
  background: C.redBg,
  border: `1.5px solid ${C.red}55`,
  borderRadius: 12,
  padding: "10px 14px",
  color: C.red,
  fontFamily: NUNITO,
  fontSize: 13,
  fontWeight: 700,
}

type AnadirActividadProps = {
  viajeId: string
  tokenSesion: string
  actividadId?: string
  onVolver?: () => void
  fechaInicial?: string
  onGuardada?: (fecha: string) => void
  onBuscarDirecciones?: (consulta: string) => Promise<ResultadoDireccion[]>
}

export default function AnadirActividad({
  viajeId,
  tokenSesion,
  actividadId,
  fechaInicial = "",
  onVolver,
  onGuardada,
  onBuscarDirecciones,
}: AnadirActividadProps) {
  const edicion = actividadId !== undefined
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [errorCarga, setErrorCarga] = useState("")
  const [titulo, setTitulo] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [hora, setHora] = useState("")
  const [horaFin, setHoraFin] = useState("")
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [fecha, setFecha] = useState("")
  const [original, setOriginal] = useState<Actividad | null>(null)
  const [resultados, setResultados] = useState<ResultadoDireccion[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState("")
  const [lugarElegido, setLugarElegido] = useState<ResultadoDireccion | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let vigente = true
    const peticiones = actividadId === undefined
      ? Promise.all([obtenerViaje(viajeId, tokenSesion), Promise.resolve(null)])
      : Promise.all([obtenerViaje(viajeId, tokenSesion), listarActividades(viajeId, tokenSesion)])
    peticiones
      .then(([datos, lista]) => {
        if (!vigente) return
        setViaje(datos)
        if (lista) {
          const actividad = lista.actividades.find((a) => a.id === actividadId) ?? null
          if (!actividad) {
            setErrorCarga("La actividad no existe en este viaje")
            return
          }
          setOriginal(actividad)
          setTitulo(actividad.titulo)
          setUbicacion(actividad.ubicacion_nombre ?? "")
          if (actividad.latitud !== null && actividad.longitud !== null) {
            setLugarElegido({
              nombre: actividad.ubicacion_nombre ?? "",
              titulo: actividad.ubicacion_nombre ?? "",
              detalle: null,
              latitud: actividad.latitud,
              longitud: actividad.longitud,
              lugar_externo_id: actividad.lugar_externo_id,
            })
          }
          setHora(actividad.hora_inicio?.slice(0, 5) ?? "")
          setHoraFin(actividad.hora_fin?.slice(0, 5) ?? "")
          setCategoria(actividad.categoria)
          setFecha(actividad.fecha)
          return
        }
        if (datos.fecha_inicio && datos.fecha_fin) {
          const enElViaje = diasDelItinerario(datos.fecha_inicio, datos.fecha_fin, []).some((d) => d.fecha === fechaInicial)
          setFecha(enElViaje ? fechaInicial : datos.fecha_inicio)
        } else {
          setFecha(fechaInicial)
        }
      })
      .catch((e) => {
        if (vigente) setErrorCarga(mensajeDeError(e))
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion, fechaInicial, actividadId])

  const dias =
    viaje?.fecha_inicio && viaje.fecha_fin
      ? diasDelItinerario(viaje.fecha_inicio, viaje.fecha_fin, original ? [original.fecha] : [])
      : []
  const editable = viaje?.estado === "activo"
  const avisoHoras =
    hora !== "" && horaFin !== "" && horaFin < hora ? "La hora de fin no puede ser anterior a la de inicio" : ""
  const datosDelFormulario: NuevaActividad = {
    titulo: titulo.trim(),
    fecha,
    hora_inicio: hora || null,
    hora_fin: hora ? horaFin || null : null,
    ubicacion_nombre: ubicacion.trim() || null,
    categoria,
    latitud: lugarElegido?.latitud ?? null,
    longitud: lugarElegido?.longitud ?? null,
    lugar_externo_id: lugarElegido?.lugar_externo_id ?? null,
  }
  const cambios: CambiosActividad = {}
  if (original) {
    if (datosDelFormulario.titulo !== original.titulo) cambios.titulo = datosDelFormulario.titulo
    if (datosDelFormulario.fecha !== original.fecha) cambios.fecha = datosDelFormulario.fecha
    if (datosDelFormulario.hora_inicio !== (original.hora_inicio?.slice(0, 5) ?? null)) {
      cambios.hora_inicio = datosDelFormulario.hora_inicio
    }
    if (datosDelFormulario.hora_fin !== (original.hora_fin?.slice(0, 5) ?? null)) {
      cambios.hora_fin = datosDelFormulario.hora_fin
    }
    if (datosDelFormulario.ubicacion_nombre !== original.ubicacion_nombre) {
      cambios.ubicacion_nombre = datosDelFormulario.ubicacion_nombre
    }
    if (datosDelFormulario.categoria !== original.categoria) cambios.categoria = datosDelFormulario.categoria
    if (
      datosDelFormulario.latitud !== original.latitud ||
      datosDelFormulario.longitud !== original.longitud ||
      datosDelFormulario.lugar_externo_id !== original.lugar_externo_id
    ) {
      cambios.latitud = datosDelFormulario.latitud
      cambios.longitud = datosDelFormulario.longitud
      cambios.lugar_externo_id = datosDelFormulario.lugar_externo_id
    }
  }
  const hayCambios = original === null || Object.keys(cambios).length > 0
  const canSubmit =
    editable && titulo.trim() !== "" && fecha !== "" && avisoHoras === "" && hayCambios && !guardando && (!edicion || original !== null)

  const cambiarLugar = (texto: string) => {
    setUbicacion(texto)
    setLugarElegido(null)
    setResultados(null)
    setErrorBusqueda("")
  }

  const elegirResultado = (resultado: ResultadoDireccion) => {
    setLugarElegido(resultado)
    setUbicacion(resultado.nombre)
    setResultados(null)
  }

  const handleBuscar = async () => {
    const consulta = ubicacion.trim()
    if (!onBuscarDirecciones || consulta.length < 3 || buscando) return
    setBuscando(true)
    setErrorBusqueda("")
    setResultados(null)
    setLugarElegido(null)
    try {
      setResultados(await onBuscarDirecciones(consulta))
    } catch (e) {
      setErrorBusqueda(mensajeDeError(e))
    } finally {
      setBuscando(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setGuardando(true)
    setError("")
    try {
      if (edicion) await editarActividad(viajeId, actividadId, cambios, tokenSesion)
      else await crearActividad(viajeId, datosDelFormulario, tokenSesion)
      onGuardada?.(fecha)
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 24px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: dias.length > 0 ? 16 : 0 }}>
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
                flexShrink: 0,
              }}
            >
              <Icon name="arrow_left" size={20} color="white" strokeWidth={2.5} />
            </button>
            <div style={{ minWidth: 0 }}>
              <SectionLabel>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>
                  Itinerario{viaje ? ` · ${viaje.nombre}` : ""}
                </span>
              </SectionLabel>
              <Heading size={22} color="white">
                {edicion ? "Editar Actividad" : "Añadir Actividad"}
              </Heading>
            </div>
          </div>
          {dias.length > 0 && (
            <div role="group" aria-label="Día de la actividad" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {dias.map((dia) => {
                const activo = fecha === dia.fecha
                return (
                  <button
                    type="button"
                    key={dia.fecha}
                    aria-pressed={activo}
                    onClick={() => setFecha(dia.fecha)}
                    style={{
                      background: activo ? "white" : "rgba(255,255,255,0.18)",
                      color: activo ? C.blue : "rgba(255,255,255,0.85)",
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
                    }}
                  >
                    {dia.texto}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ padding: "20px 16px 32px" }}>
          {errorCarga && (
            <div role="alert" style={alertaStyle}>
              No se ha podido cargar el viaje: {errorCarga}
            </div>
          )}

          {viaje && !editable && (
            <div role="alert" style={alertaStyle}>
              {edicion
                ? "El viaje está cerrado y ya no se pueden modificar actividades"
                : "El viaje está cerrado y ya no se pueden añadir actividades"}
            </div>
          )}

          {viaje && editable && (!edicion || original !== null) && (
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="actividad-titulo" style={labelStyle}>
                  Nombre de la actividad
                </label>
                <input
                  id="actividad-titulo"
                  value={titulo}
                  maxLength={200}
                  onChange={(event) => setTitulo(event.target.value)}
                  placeholder="Ej. Visita al Coliseo"
                  style={inputStyle}
                />
              </div>

              {dias.length === 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="actividad-fecha" style={labelStyle}>
                    Fecha
                  </label>
                  <input
                    id="actividad-fecha"
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="actividad-lugar" style={labelStyle}>
                  Lugar / Dirección
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    id="actividad-lugar"
                    value={ubicacion}
                    onChange={(event) => cambiarLugar(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || !onBuscarDirecciones) return
                      event.preventDefault()
                      handleBuscar()
                    }}
                    placeholder="Ej. Piazza del Colosseo"
                    style={{ ...inputStyle, flex: 1, minWidth: 0, width: "auto" }}
                  />
                  {onBuscarDirecciones && (
                    <button
                      type="button"
                      onClick={handleBuscar}
                      disabled={ubicacion.trim().length < 3 || buscando}
                      aria-label="Buscar dirección"
                      style={{
                        width: 50,
                        flexShrink: 0,
                        background: C.blue,
                        border: "none",
                        borderRadius: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: ubicacion.trim().length < 3 || buscando ? "not-allowed" : "pointer",
                        opacity: ubicacion.trim().length < 3 || buscando ? 0.6 : 1,
                        boxShadow: SHADOWS.button,
                      }}
                    >
                      <Icon name="search" size={20} color="white" strokeWidth={2.2} />
                    </button>
                  )}
                </div>

                {buscando && (
                  <div role="status" style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, marginTop: 8 }}>
                    Buscando...
                  </div>
                )}

                {errorBusqueda && (
                  <div role="alert" style={{ ...alertaStyle, marginTop: 8 }}>
                    {errorBusqueda}
                  </div>
                )}

                {resultados !== null && resultados.length === 0 && (
                  <div role="status" style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>
                    No se han encontrado resultados. Puedes guardar el lugar como texto o probar con otra dirección.
                  </div>
                )}

                {resultados !== null && resultados.length > 0 && (
                  <div role="list" aria-label="Resultados de la búsqueda" style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {resultados.map((resultado) => (
                      <div role="listitem" key={`${resultado.latitud},${resultado.longitud},${resultado.nombre}`}>
                        <button
                          type="button"
                          onClick={() => elegirResultado(resultado)}
                          aria-label={resultado.detalle ? `${resultado.titulo}, ${resultado.detalle}` : resultado.titulo}
                          style={{
                            width: "100%",
                            background: "white",
                            border: `1.5px solid ${C.border}`,
                            borderRadius: 12,
                            padding: "10px 12px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            textAlign: "left",
                            cursor: "pointer",
                            fontFamily: NUNITO,
                            fontSize: 13,
                            color: C.navy,
                            lineHeight: 1.4,
                          }}
                        >
                          <Icon name="pin" size={15} color={C.blue} strokeWidth={2} />
                          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                            <span style={{ fontWeight: 800, overflowWrap: "anywhere" }}>{resultado.titulo}</span>
                            {resultado.detalle && (
                              <span style={{ fontSize: 12, color: C.muted, overflowWrap: "anywhere" }}>{resultado.detalle}</span>
                            )}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {lugarElegido && (
                  <div
                    role="status"
                    style={{
                      marginTop: 8,
                      background: C.greenBg,
                      border: `1.5px solid ${C.greenMid}55`,
                      borderRadius: 12,
                      padding: "9px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: NUNITO,
                      fontSize: 12,
                      color: C.green,
                      fontWeight: 700,
                    }}
                  >
                    <Icon name="pin" size={15} color={C.green} strokeWidth={2} />
                    <span style={{ flex: 1 }}>Ubicación localizada en el mapa</span>
                    <button
                      type="button"
                      onClick={() => setLugarElegido(null)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: C.green,
                        fontFamily: NUNITO,
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: "underline",
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: avisoHoras ? 6 : 24 }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="actividad-hora" style={labelStyle}>
                    Hora
                  </label>
                  <input
                    id="actividad-hora"
                    type="time"
                    value={hora}
                    onChange={(event) => setHora(event.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="actividad-hora-fin" style={labelStyle}>
                    Hasta (opcional)
                  </label>
                  <input
                    id="actividad-hora-fin"
                    type="time"
                    value={hora ? horaFin : ""}
                    disabled={hora === ""}
                    min={hora || undefined}
                    onChange={(event) => setHoraFin(event.target.value)}
                    aria-invalid={avisoHoras !== ""}
                    aria-describedby={avisoHoras ? "actividad-horas-aviso" : undefined}
                    style={{ ...inputStyle, opacity: hora === "" ? 0.6 : 1 }}
                  />
                </div>
              </div>
              {avisoHoras && (
                <div
                  id="actividad-horas-aviso"
                  role="alert"
                  style={{ fontFamily: NUNITO, color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 24 }}
                >
                  {avisoHoras}
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <span id="actividad-tipo" style={labelStyle}>
                  Tipo (opcional)
                </span>
                <div role="group" aria-labelledby="actividad-tipo" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CATEGORIAS.map(({ valor, texto, icono }) => {
                    const elegida = categoria === valor
                    return (
                      <button
                        type="button"
                        key={valor}
                        aria-pressed={elegida}
                        onClick={() => setCategoria(elegida ? null : valor)}
                        style={{
                          background: elegida ? C.lightBlue : "white",
                          color: elegida ? C.blue : C.navy,
                          border: `1.5px solid ${elegida ? C.blue : C.border}`,
                          borderRadius: 999,
                          padding: "8px 14px",
                          fontFamily: NUNITO,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Icon name={icono} size={15} color={elegida ? C.blue : C.muted} strokeWidth={2} />
                        {texto}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div role="alert" style={{ ...alertaStyle, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  width: "100%",
                  background: C.blue,
                  color: "white",
                  border: "none",
                  borderRadius: 16,
                  padding: 15,
                  fontFamily: NUNITO,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  opacity: canSubmit ? 1 : 0.6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: SHADOWS.button,
                }}
              >
                <Icon name={edicion ? "check" : "plus"} size={18} color="white" strokeWidth={2.5} />
                {guardando ? "Guardando..." : edicion ? "Guardar cambios" : "Añadir al itinerario"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
