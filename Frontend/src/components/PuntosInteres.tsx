import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react"
import Avatar from "./Avatar"
import { ALTO_BARRA_INFERIOR } from "./BarraInferior"
import DialogoConfirmacion from "./DialogoConfirmacion"
import Icon from "./Icon"
import SectionLabel from "./SectionLabel"
import type { UbicacionElegida } from "./MapaPuntosInteres"
import { CATEGORIAS, iconoDeCategoria, type Categoria, type ResultadoDireccion } from "../services/actividadesApi"
import { ApiError } from "../services/authApi"
import {
  crearPuntoInteres,
  eliminarPuntoInteres,
  listarPuntosInteres,
  type PuntoInteres,
} from "../services/puntosInteresApi"
import type { ViajeDelUsuario } from "../services/viajesApi"
import { estiloAlerta, estiloCampo, estiloEtiqueta } from "../styles/formulario"
import { C, NUNITO, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import { urlDeLugarEnGoogleMaps } from "../utils/googleMaps"

const MapaPuntosInteres = lazy(() => import("./MapaPuntosInteres"))

const ALTO_MAPA_CARGANDO = 280
const SIN_TIPO = "sin_tipo"

type FiltroTipo = Categoria | typeof SIN_TIPO

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const avisoStyle: CSSProperties = {
  fontFamily: NUNITO,
  color: C.muted,
  fontSize: 13,
  textAlign: "center",
  padding: "24px 0",
}

const tarjetaStyle: CSSProperties = {
  background: "white",
  borderRadius: 22,
  overflow: "hidden",
  isolation: "isolate",
  boxShadow: SHADOWS.card,
  border: `1.5px solid ${C.border}`,
  marginBottom: 14,
}

const chipStyle = (activo: boolean): CSSProperties => ({
  background: activo ? C.lightBlue : "white",
  color: activo ? C.blue : C.navy,
  border: `1.5px solid ${activo ? C.blue : C.border}`,
  borderRadius: 999,
  padding: "6px 12px",
  minHeight: 36,
  fontFamily: NUNITO,
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
  flexShrink: 0,
})

const botonPanelStyle = (principal: boolean, habilitado = true): CSSProperties => ({
  flex: 1,
  minHeight: 48,
  boxSizing: "border-box",
  borderRadius: 14,
  border: principal ? "none" : `1.5px solid ${C.blue}`,
  background: principal ? C.blue : "white",
  color: principal ? "white" : C.blue,
  fontFamily: NUNITO,
  fontWeight: 800,
  fontSize: 14,
  cursor: habilitado ? "pointer" : "not-allowed",
  opacity: habilitado ? 1 : 0.6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  textDecoration: "none",
  padding: "0 12px",
})

const textoDeTipo = (categoria: Categoria | null) => CATEGORIAS.find((c) => c.valor === categoria)?.texto ?? "Sin tipo"

const desplazar = (elemento: HTMLElement | null) => {
  const suave = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  elemento?.scrollIntoView?.({ behavior: suave ? "smooth" : "auto", block: "start" })
}

type PanelInferiorProps = {
  titulo: string
  ampliado: boolean
  onCerrar: () => void
  textoCerrar: string
  children: ReactNode
}

function PanelInferior({ titulo, ampliado, onCerrar, textoCerrar, children }: PanelInferiorProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: ampliado ? 0 : ALTO_BARRA_INFERIOR,
        zIndex: 55,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <section
        role="dialog"
        aria-modal="false"
        aria-label={titulo}
        style={{
          width: "100%",
          maxWidth: 480,
          boxSizing: "border-box",
          maxHeight: ampliado ? "70dvh" : "min(62dvh, 560px)",
          overflowY: "auto",
          background: "white",
          borderRadius: "22px 22px 0 0",
          boxShadow: "0 -10px 30px rgba(13,31,60,0.22)",
          padding: ampliado ? "8px 16px calc(16px + env(safe-area-inset-bottom))" : "8px 16px 16px",
          pointerEvents: "auto",
        }}
      >
        <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: "0 auto 6px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontFamily: NUNITO, fontSize: 16, fontWeight: 800, color: C.navy, overflowWrap: "anywhere" }}>
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={textoCerrar}
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 12,
              border: "none",
              background: C.lightBlue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="close" size={18} color={C.navy} strokeWidth={2.4} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

type PuntosInteresProps = {
  viajeId: string
  tokenSesion: string
  viaje: ViajeDelUsuario
  editable: boolean
  onBuscarDirecciones?: (consulta: string) => Promise<ResultadoDireccion[]>
}

export default function PuntosInteres({ viajeId, tokenSesion, viaje, editable, onBuscarDirecciones }: PuntosInteresProps) {
  const [puntos, setPuntos] = useState<PuntoInteres[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [intento, setIntento] = useState(0)
  const [elegida, setElegida] = useState<UbicacionElegida | null>(null)
  const [lugarExternoId, setLugarExternoId] = useState<string | null>(null)
  const [consulta, setConsulta] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState("")
  const [resultados, setResultados] = useState<ResultadoDireccion[] | null>(null)
  const [nombre, setNombre] = useState("")
  const [nota, setNota] = useState("")
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState("")
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [enfocado, setEnfocado] = useState<{ id: string; vez: number } | null>(null)
  const [aEliminar, setAEliminar] = useState<PuntoInteres | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState("")
  const [mapaAmpliado, setMapaAmpliado] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo | null>(null)
  const [filtroAutor, setFiltroAutor] = useState<string | null>(null)
  const tarjetaMapa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let vigente = true
    listarPuntosInteres(viajeId, tokenSesion)
      .then((datos) => {
        if (!vigente) return
        setPuntos(datos.puntos_interes)
        setError("")
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
  }, [viajeId, tokenSesion, intento])

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

  const indiceDeMiembro = (usuarioId: string | null) => viaje.miembros.findIndex((miembro) => miembro.usuario_id === usuarioId)

  const opcionesTipo: FiltroTipo[] = [
    ...CATEGORIAS.filter((c) => puntos.some((p) => p.categoria === c.valor)).map((c) => c.valor),
    ...(puntos.some((p) => p.categoria === null) ? [SIN_TIPO as FiltroTipo] : []),
  ]
  const autores = viaje.miembros.filter((miembro) => puntos.some((p) => p.creado_por === miembro.usuario_id))
  const tipoActivo = filtroTipo !== null && opcionesTipo.includes(filtroTipo) ? filtroTipo : null
  const autorActivo = filtroAutor !== null && autores.some((a) => a.usuario_id === filtroAutor) ? filtroAutor : null
  const visibles = puntos.filter(
    (p) =>
      (tipoActivo === null || (tipoActivo === SIN_TIPO ? p.categoria === null : p.categoria === tipoActivo)) &&
      (autorActivo === null || p.creado_por === autorActivo),
  )
  const filtrando = tipoActivo !== null || autorActivo !== null
  const puntoSeleccionado = visibles.find((p) => p.id === seleccionado) ?? null

  const limpiarFormulario = () => {
    setElegida(null)
    setLugarExternoId(null)
    setNombre("")
    setNota("")
    setCategoria(null)
    setErrorGuardar("")
  }

  const verMapa = () => {
    if (!mapaAmpliado) desplazar(tarjetaMapa.current)
  }

  const alTocarMapa = (ubicacion: UbicacionElegida) => {
    if (puntoSeleccionado) {
      setSeleccionado(null)
      return
    }
    if (!editable) return
    setElegida(ubicacion)
    setLugarExternoId(null)
    setResultados(null)
    verMapa()
  }

  const elegirPunto = (id: string) => {
    setSeleccionado(id)
    setEnfocado({ id, vez: Date.now() })
    verMapa()
  }

  const handleBuscar = async () => {
    const texto = consulta.trim()
    if (!onBuscarDirecciones || texto.length < 3 || buscando) return
    setBuscando(true)
    setErrorBusqueda("")
    setResultados(null)
    try {
      setResultados(await onBuscarDirecciones(texto))
    } catch (e) {
      setErrorBusqueda(mensajeDeError(e))
    } finally {
      setBuscando(false)
    }
  }

  const elegirResultado = (resultado: ResultadoDireccion) => {
    setSeleccionado(null)
    setElegida({ latitud: resultado.latitud, longitud: resultado.longitud })
    setLugarExternoId(resultado.lugar_externo_id)
    if (nombre.trim() === "") setNombre(resultado.titulo.slice(0, 120))
    setConsulta("")
    setResultados(null)
    verMapa()
  }

  const puedeGuardar = editable && elegida !== null && nombre.trim() !== "" && !guardando

  const handleGuardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!puedeGuardar || !elegida) return
    setGuardando(true)
    setErrorGuardar("")
    try {
      const creado = await crearPuntoInteres(
        viajeId,
        {
          nombre: nombre.trim(),
          nota: nota.trim() === "" ? null : nota.trim(),
          categoria,
          latitud: elegida.latitud,
          longitud: elegida.longitud,
          lugar_externo_id: lugarExternoId,
        },
        tokenSesion,
      )
      setPuntos((actuales) => [...actuales, creado])
      limpiarFormulario()
      setFiltroTipo(null)
      setFiltroAutor(null)
      setSeleccionado(creado.id)
      setEnfocado({ id: creado.id, vez: Date.now() })
    } catch (e) {
      setErrorGuardar(mensajeDeError(e))
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    if (!aEliminar) return
    setEliminando(true)
    setErrorEliminar("")
    try {
      await eliminarPuntoInteres(viajeId, aEliminar.id, tokenSesion)
      setPuntos((actuales) => actuales.filter((punto) => punto.id !== aEliminar.id))
      if (seleccionado === aEliminar.id) setSeleccionado(null)
      setAEliminar(null)
    } catch (e) {
      setErrorEliminar(mensajeDeError(e))
    } finally {
      setEliminando(false)
    }
  }

  const deshabilitadoBuscar = consulta.trim().length < 3 || buscando
  const panelAbierto = puntoSeleccionado !== null || (editable && elegida !== null)
  const autorSeleccionado = puntoSeleccionado ? indiceDeMiembro(puntoSeleccionado.creado_por) : -1

  return (
    <div role="tabpanel" aria-label="Puntos de interés">
      {error && (
        <div role="alert" style={{ ...estiloAlerta, marginBottom: 14 }}>
          No se han podido cargar los puntos de interés: {error}
          <button
            type="button"
            onClick={() => {
              setCargando(true)
              setIntento((n) => n + 1)
            }}
            style={{
              background: "none",
              border: "none",
              padding: "0 0 0 8px",
              cursor: "pointer",
              color: C.red,
              fontFamily: NUNITO,
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "underline",
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      <div
        ref={tarjetaMapa}
        style={{
          ...tarjetaStyle,
          scrollMarginTop: 8,
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
        {editable && (
          <div style={{ flexShrink: 0, padding: 10, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                aria-label="Buscar una dirección"
                value={consulta}
                onChange={(evento) => {
                  setConsulta(evento.target.value)
                  setResultados(null)
                  setErrorBusqueda("")
                }}
                onKeyDown={(evento) => {
                  if (evento.key !== "Enter" || !onBuscarDirecciones) return
                  evento.preventDefault()
                  void handleBuscar()
                }}
                placeholder="Busca un sitio o toca el mapa"
                style={{ ...estiloCampo, flex: 1, minWidth: 0, width: "auto", padding: "11px 14px" }}
              />
              {onBuscarDirecciones && (
                <button
                  type="button"
                  onClick={handleBuscar}
                  disabled={deshabilitadoBuscar}
                  aria-label="Buscar dirección"
                  style={{
                    width: 48,
                    flexShrink: 0,
                    background: C.blue,
                    border: "none",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: deshabilitadoBuscar ? "not-allowed" : "pointer",
                    opacity: deshabilitadoBuscar ? 0.6 : 1,
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
              <div role="alert" style={{ ...estiloAlerta, marginTop: 8 }}>
                {errorBusqueda}
              </div>
            )}

            {resultados !== null && resultados.length === 0 && (
              <div role="status" style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>
                No se han encontrado resultados. Prueba con otra dirección o toca el mapa.
              </div>
            )}

            {resultados !== null && resultados.length > 0 && (
              <div
                role="list"
                aria-label="Resultados de la búsqueda"
                style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, maxHeight: 220, overflowY: "auto" }}
              >
                {resultados.map((resultado) => (
                  <div role="listitem" key={`${resultado.latitud},${resultado.longitud},${resultado.nombre}`}>
                    <button
                      type="button"
                      onClick={() => elegirResultado(resultado)}
                      aria-label={resultado.detalle ? `${resultado.titulo}, ${resultado.detalle}` : resultado.titulo}
                      style={{
                        width: "100%",
                        minHeight: 44,
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
          </div>
        )}

        <Suspense
          fallback={
            <div
              role="status"
              style={{ ...avisoStyle, height: ALTO_MAPA_CARGANDO, boxSizing: "border-box", background: C.lightBlue }}
            >
              Cargando mapa...
            </div>
          }
        >
          <MapaPuntosInteres
            puntos={visibles}
            elegida={editable ? elegida : null}
            seleccionado={puntoSeleccionado?.id ?? null}
            enfocado={enfocado}
            alTocarMapa={alTocarMapa}
            alElegirPunto={elegirPunto}
            ampliado={mapaAmpliado}
            alAlternarAmpliado={() => setMapaAmpliado((valor) => !valor)}
            desplazamiento={mapaAmpliado ? 160 : 90}
          />
        </Suspense>

        {!editable && (
          <div style={{ flexShrink: 0, fontFamily: NUNITO, color: C.muted, fontSize: 12, lineHeight: 1.5, padding: "10px 14px" }}>
            Solo se pueden añadir puntos mientras el viaje está activo.
          </div>
        )}
      </div>

      {opcionesTipo.length > 1 && (
        <div
          role="group"
          aria-label="Filtrar por tipo"
          style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 8 }}
        >
          <button type="button" aria-pressed={tipoActivo === null} onClick={() => setFiltroTipo(null)} style={chipStyle(tipoActivo === null)}>
            Todos
          </button>
          {opcionesTipo.map((opcion) => {
            const activo = tipoActivo === opcion
            const categoriaDeOpcion = opcion === SIN_TIPO ? null : opcion
            return (
              <button
                type="button"
                key={opcion}
                aria-pressed={activo}
                onClick={() => setFiltroTipo(activo ? null : opcion)}
                style={chipStyle(activo)}
              >
                <Icon name={iconoDeCategoria(categoriaDeOpcion)} size={14} color={activo ? C.blue : C.muted} strokeWidth={2} />
                {textoDeTipo(categoriaDeOpcion)}
              </button>
            )
          })}
        </div>
      )}

      {autores.length > 1 && (
        <div
          role="group"
          aria-label="Filtrar por quién lo añadió"
          style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 8 }}
        >
          <span style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
            Añadidos por
          </span>
          {autores.map((autor) => {
            const activo = autorActivo === autor.usuario_id
            const nombreAutor = autor.nombre ?? "Viajero"
            return (
              <button
                type="button"
                key={autor.usuario_id}
                aria-pressed={activo}
                onClick={() => setFiltroAutor(activo ? null : autor.usuario_id)}
                style={chipStyle(activo)}
              >
                <Avatar member={aMiembro(autor.nombre, indiceDeMiembro(autor.usuario_id), autor.avatar_url)} size={20} showBorder={false} />
                {nombreAutor}
              </button>
            )
          })}
        </div>
      )}

      <SectionLabel>{`Puntos de interés${puntos.length > 0 ? ` (${filtrando ? `${visibles.length} de ${puntos.length}` : puntos.length})` : ""}`}</SectionLabel>

      {cargando && (
        <div role="status" style={avisoStyle}>
          Cargando puntos de interés...
        </div>
      )}

      {!cargando && !error && puntos.length === 0 && (
        <div style={avisoStyle}>
          Todavía no hay puntos de interés en este viaje.{editable ? " Toca el mapa o busca un sitio para añadir el primero." : ""}
        </div>
      )}

      {puntos.length > 0 && visibles.length === 0 && <div style={avisoStyle}>Ningún punto coincide con el filtro.</div>}

      {visibles.length > 0 && (
        <div role="list" aria-label="Puntos de interés" style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
          {visibles.map((punto) => {
            const indice = indiceDeMiembro(punto.creado_por)
            const autor = indice >= 0 ? viaje.miembros[indice] : null
            const elegido = puntoSeleccionado?.id === punto.id
            return (
              <div
                role="listitem"
                key={punto.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "white",
                  borderRadius: 16,
                  boxShadow: SHADOWS.card,
                  border: `1.5px solid ${elegido ? C.navy : C.border}`,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => elegirPunto(punto.id)}
                  aria-label={`Ver ${punto.nombre} en el mapa`}
                  aria-current={elegido ? "true" : undefined}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "none",
                    border: "none",
                    padding: "12px 0 12px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: NUNITO,
                  }}
                >
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: elegido ? C.navy : C.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={iconoDeCategoria(punto.categoria)} size={18} color="white" strokeWidth={2} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span style={{ color: C.navy, fontSize: 14, fontWeight: 800, overflowWrap: "anywhere" }}>{punto.nombre}</span>
                    {punto.categoria && (
                      <span style={{ color: C.accent, fontSize: 11, fontWeight: 800 }}>{textoDeTipo(punto.categoria)}</span>
                    )}
                    {punto.nota && (
                      <span
                        style={{
                          color: C.muted,
                          fontSize: 12,
                          lineHeight: 1.4,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {punto.nota}
                      </span>
                    )}
                  </span>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 0 0", flexShrink: 0 }}>
                  {autor && (
                    <div role="img" aria-label={`Añadido por ${autor.nombre ?? "un viajero"}`}>
                      <Avatar member={aMiembro(autor.nombre, indice, autor.avatar_url)} size={26} showBorder={false} />
                    </div>
                  )}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorEliminar("")
                        setAEliminar(punto)
                      }}
                      aria-label={`Eliminar ${punto.nombre}`}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        border: "none",
                        background: C.redBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="trash" size={16} color={C.red} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {panelAbierto && <div aria-hidden="true" style={{ height: "45dvh" }} />}

      {puntoSeleccionado ? (
        <PanelInferior
          titulo={puntoSeleccionado.nombre}
          ampliado={mapaAmpliado}
          onCerrar={() => setSeleccionado(null)}
          textoCerrar="Cerrar ficha"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: C.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name={iconoDeCategoria(puntoSeleccionado.categoria)} size={18} color="white" strokeWidth={2} />
            </span>
            <span style={{ fontFamily: NUNITO, color: C.accent, fontSize: 13, fontWeight: 800 }}>
              {textoDeTipo(puntoSeleccionado.categoria)}
            </span>
          </div>
          {puntoSeleccionado.nota && (
            <p style={{ margin: "0 0 12px", fontFamily: NUNITO, color: C.navy, fontSize: 14, lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {puntoSeleccionado.nota}
            </p>
          )}
          {autorSeleccionado >= 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontFamily: NUNITO, fontSize: 12, color: C.muted }}>
              <Avatar
                member={aMiembro(
                  viaje.miembros[autorSeleccionado].nombre,
                  autorSeleccionado,
                  viaje.miembros[autorSeleccionado].avatar_url,
                )}
                size={24}
                showBorder={false}
              />
              Añadido por {viaje.miembros[autorSeleccionado].nombre ?? "un viajero"}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href={urlDeLugarEnGoogleMaps(puntoSeleccionado)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...botonPanelStyle(false), minWidth: 180 }}
            >
              Abrir en Google Maps
            </a>
            {editable && (
              <button
                type="button"
                onClick={() => {
                  setErrorEliminar("")
                  setAEliminar(puntoSeleccionado)
                }}
                style={{ ...botonPanelStyle(false), flex: "0 0 auto", border: "none", background: C.redBg, color: C.red }}
              >
                <Icon name="trash" size={16} color={C.red} strokeWidth={2} />
                Borrar
              </button>
            )}
          </div>
        </PanelInferior>
      ) : (
        editable &&
        elegida && (
          <PanelInferior titulo="Nuevo punto de interés" ampliado={mapaAmpliado} onCerrar={limpiarFormulario} textoCerrar="Descartar punto">
            <form onSubmit={handleGuardar} noValidate>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="punto-nombre" style={estiloEtiqueta}>
                  Nombre del punto
                </label>
                <input
                  id="punto-nombre"
                  value={nombre}
                  maxLength={120}
                  onChange={(evento) => setNombre(evento.target.value)}
                  placeholder="Ej. Heladería del Teatro"
                  style={estiloCampo}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="punto-nota" style={estiloEtiqueta}>
                  Nota (opcional)
                </label>
                <textarea
                  id="punto-nota"
                  value={nota}
                  maxLength={300}
                  rows={2}
                  onChange={(evento) => setNota(evento.target.value)}
                  placeholder="Ej. Abre hasta las 23:00"
                  style={{ ...estiloCampo, resize: "vertical" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <span id="punto-tipo" style={estiloEtiqueta}>
                  Tipo (opcional)
                </span>
                <div role="group" aria-labelledby="punto-tipo" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CATEGORIAS.map(({ valor, texto, icono }) => {
                    const activo = categoria === valor
                    return (
                      <button
                        type="button"
                        key={valor}
                        aria-pressed={activo}
                        onClick={() => setCategoria(activo ? null : valor)}
                        style={{ ...chipStyle(activo), minHeight: 40 }}
                      >
                        <Icon name={icono} size={15} color={activo ? C.blue : C.muted} strokeWidth={2} />
                        {texto}
                      </button>
                    )
                  })}
                </div>
              </div>

              {errorGuardar && (
                <div role="alert" style={{ ...estiloAlerta, marginBottom: 12 }}>
                  {errorGuardar}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={limpiarFormulario} style={botonPanelStyle(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={!puedeGuardar} style={botonPanelStyle(true, puedeGuardar)}>
                  {guardando ? "Guardando..." : "Guardar punto"}
                </button>
              </div>
            </form>
          </PanelInferior>
        )
      )}

      {aEliminar && (
        <DialogoConfirmacion
          titulo="¿Eliminar este punto de interés?"
          icono="trash"
          color={C.red}
          colorFondo={C.redBg}
          textoConfirmar="Eliminar punto"
          textoConfirmando="Eliminando..."
          ocupado={eliminando}
          error={errorEliminar}
          zIndex={70}
          onConfirmar={handleEliminar}
          onCancelar={() => setAEliminar(null)}
        >
          Se eliminará <strong style={{ color: C.navy }}>{aEliminar.nombre}</strong> del mapa para todos los viajeros. Esta
          acción no se puede deshacer.
        </DialogoConfirmacion>
      )}
    </div>
  )
}
