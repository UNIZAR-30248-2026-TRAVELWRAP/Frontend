import { lazy, Suspense, useEffect, useState, type CSSProperties, type FormEvent } from "react"
import Avatar from "./Avatar"
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
  const [enfocado, setEnfocado] = useState<{ id: string; vez: number } | null>(null)
  const [aEliminar, setAEliminar] = useState<PuntoInteres | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState("")
  const [mapaAmpliado, setMapaAmpliado] = useState(false)

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

  const limpiarFormulario = () => {
    setElegida(null)
    setLugarExternoId(null)
    setConsulta("")
    setResultados(null)
    setErrorBusqueda("")
    setNombre("")
    setNota("")
    setCategoria(null)
    setErrorGuardar("")
  }

  const alTocarMapa = (ubicacion: UbicacionElegida) => {
    setElegida(ubicacion)
    setLugarExternoId(null)
    setResultados(null)
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
    setElegida({ latitud: resultado.latitud, longitud: resultado.longitud })
    setLugarExternoId(resultado.lugar_externo_id)
    if (nombre.trim() === "") setNombre(resultado.titulo.slice(0, 120))
    setConsulta(resultado.nombre)
    setResultados(null)
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
      setAEliminar(null)
    } catch (e) {
      setErrorEliminar(mensajeDeError(e))
    } finally {
      setEliminando(false)
    }
  }

  const indiceDeMiembro = (usuarioId: string | null) => viaje.miembros.findIndex((miembro) => miembro.usuario_id === usuarioId)
  const deshabilitadoBuscar = consulta.trim().length < 3 || buscando

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
        style={{
          ...tarjetaStyle,
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
              style={{ ...avisoStyle, height: ALTO_MAPA_CARGANDO, boxSizing: "border-box", background: C.lightBlue }}
            >
              Cargando mapa...
            </div>
          }
        >
          <MapaPuntosInteres
            puntos={puntos}
            elegida={elegida}
            enfocado={enfocado}
            alTocarMapa={editable ? alTocarMapa : undefined}
            ampliado={mapaAmpliado}
            alAlternarAmpliado={() => setMapaAmpliado((valor) => !valor)}
          />
        </Suspense>
        <div
          style={{
            flexShrink: 0,
            fontFamily: NUNITO,
            color: C.muted,
            fontSize: 12,
            padding: "8px 14px",
            ...(mapaAmpliado ? { paddingBottom: "calc(8px + env(safe-area-inset-bottom))" } : {}),
          }}
        >
          {editable
            ? elegida && mapaAmpliado
              ? "Ubicación elegida. Reduce el mapa para ponerle nombre y guardarla."
              : "Toca el mapa o busca una dirección para elegir dónde está el punto."
            : "Solo se pueden añadir puntos mientras el viaje está activo."}
        </div>
      </div>

      {editable && (
        <form onSubmit={handleGuardar} noValidate style={{ ...tarjetaStyle, padding: 14 }}>
          <label htmlFor="punto-busqueda" style={estiloEtiqueta}>
            Buscar una dirección
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="punto-busqueda"
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
              placeholder="Ej. Fontana di Trevi"
              style={{ ...estiloCampo, flex: 1, minWidth: 0, width: "auto" }}
            />
            {onBuscarDirecciones && (
              <button
                type="button"
                onClick={handleBuscar}
                disabled={deshabilitadoBuscar}
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
                  cursor: deshabilitadoBuscar ? "not-allowed" : "pointer",
                  opacity: deshabilitadoBuscar ? 0.6 : 1,
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
              style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}
            >
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

          {elegida && (
            <div style={{ marginTop: 14 }}>
              <div
                role="status"
                style={{
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
                  marginBottom: 14,
                }}
              >
                <Icon name="pin" size={15} color={C.green} strokeWidth={2} />
                <span style={{ flex: 1 }}>Ubicación elegida en el mapa</span>
                <button
                  type="button"
                  onClick={limpiarFormulario}
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
                  Descartar
                </button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label htmlFor="punto-nombre" style={estiloEtiqueta}>
                  Nombre del punto
                </label>
                <input
                  id="punto-nombre"
                  value={nombre}
                  maxLength={120}
                  onChange={(evento) => setNombre(evento.target.value)}
                  placeholder="Ej. Heladería Gelateria del Teatro"
                  style={estiloCampo}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
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

              <div style={{ marginBottom: 16 }}>
                <span id="punto-tipo" style={estiloEtiqueta}>
                  Tipo (opcional)
                </span>
                <div role="group" aria-labelledby="punto-tipo" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CATEGORIAS.map(({ valor, texto, icono }) => {
                    const elegido = categoria === valor
                    return (
                      <button
                        type="button"
                        key={valor}
                        aria-pressed={elegido}
                        onClick={() => setCategoria(elegido ? null : valor)}
                        style={{
                          background: elegido ? C.lightBlue : "white",
                          color: elegido ? C.blue : C.navy,
                          border: `1.5px solid ${elegido ? C.blue : C.border}`,
                          borderRadius: 999,
                          padding: "8px 14px",
                          minHeight: 40,
                          fontFamily: NUNITO,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Icon name={icono} size={15} color={elegido ? C.blue : C.muted} strokeWidth={2} />
                        {texto}
                      </button>
                    )
                  })}
                </div>
              </div>

              {errorGuardar && (
                <div role="alert" style={{ ...estiloAlerta, marginBottom: 14 }}>
                  {errorGuardar}
                </div>
              )}

              <button
                type="submit"
                disabled={!puedeGuardar}
                style={{
                  width: "100%",
                  background: C.blue,
                  color: "white",
                  border: "none",
                  borderRadius: 16,
                  padding: 14,
                  fontFamily: NUNITO,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: puedeGuardar ? "pointer" : "not-allowed",
                  opacity: puedeGuardar ? 1 : 0.6,
                  boxShadow: SHADOWS.button,
                }}
              >
                {guardando ? "Guardando..." : "Guardar punto de interés"}
              </button>
            </div>
          )}
        </form>
      )}

      <SectionLabel>{`Puntos de interés${puntos.length > 0 ? ` (${puntos.length})` : ""}`}</SectionLabel>

      {cargando && (
        <div role="status" style={avisoStyle}>
          Cargando puntos de interés...
        </div>
      )}

      {!cargando && !error && puntos.length === 0 && (
        <div style={avisoStyle}>
          Todavía no hay puntos de interés en este viaje.{editable ? " Toca el mapa para añadir el primero." : ""}
        </div>
      )}

      {puntos.length > 0 && (
        <div role="list" aria-label="Puntos de interés" style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 28 }}>
          {puntos.map((punto) => {
            const indice = indiceDeMiembro(punto.creado_por)
            const autor = indice >= 0 ? viaje.miembros[indice] : null
            const texto = CATEGORIAS.find((c) => c.valor === punto.categoria)?.texto
            return (
              <div
                role="listitem"
                key={punto.id}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 8,
                  background: "white",
                  borderRadius: 16,
                  boxShadow: SHADOWS.card,
                  border: `1.5px solid ${C.border}`,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setEnfocado({ id: punto.id, vez: Date.now() })}
                  aria-label={`Ver ${punto.nombre} en el mapa`}
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
                      background: C.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={iconoDeCategoria(punto.categoria)} size={18} color="white" strokeWidth={2} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span style={{ color: C.navy, fontSize: 13, fontWeight: 800, overflowWrap: "anywhere" }}>{punto.nombre}</span>
                    {texto && <span style={{ color: C.accent, fontSize: 11, fontWeight: 800 }}>{texto}</span>}
                    {punto.nota && (
                      <span style={{ color: C.muted, fontSize: 12, lineHeight: 1.4, overflowWrap: "anywhere" }}>{punto.nota}</span>
                    )}
                  </span>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 0 0", flexShrink: 0 }}>
                  {autor && (
                    <div role="img" aria-label={`Añadido por ${autor.nombre ?? "un viajero"}`}>
                      <Avatar member={aMiembro(autor.nombre, indice, autor.avatar_url)} size={26} showBorder={false} />
                    </div>
                  )}
                  <a
                    href={urlDeLugarEnGoogleMaps(punto)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${punto.nombre} en Google Maps`}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: C.lightBlue,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="export" size={15} color={C.blue} strokeWidth={2} />
                  </a>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorEliminar("")
                        setAEliminar(punto)
                      }}
                      aria-label={`Eliminar ${punto.nombre}`}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        border: "none",
                        background: C.redBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="trash" size={15} color={C.red} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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
