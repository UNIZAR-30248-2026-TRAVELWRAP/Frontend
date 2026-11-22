import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "./MapaActividades.css"
import Icon from "./Icon"
import type { PuntoInteres } from "../services/puntosInteresApi"
import { C, SHADOWS } from "../styles/tokens"

export type UbicacionElegida = { latitud: number; longitud: number }

type MapaPuntosInteresProps = {
  puntos: PuntoInteres[]
  elegida: UbicacionElegida | null
  seleccionado: string | null
  enfocado: { id: string; vez: number } | null
  alTocarMapa: (ubicacion: UbicacionElegida) => void
  alElegirPunto: (id: string) => void
  ampliado?: boolean
  alAlternarAmpliado?: () => void
  desplazamiento?: number
}

export const ALTO_MAPA_PUNTOS = 280

const sinMovimiento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

const moverA = (mapa: L.Map, destino: L.LatLng, margen: number) => {
  const zoom = Math.max(mapa.getZoom(), 15)
  const centro = mapa.unproject(mapa.project(destino, zoom).add([0, margen]), zoom)
  if (sinMovimiento()) {
    mapa.setView(centro, zoom, { animate: false })
    return
  }
  mapa.flyTo(centro, zoom, { duration: 0.6 })
}

const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const FORMA = "M18 1.5C9 1.5 2 8.5 2 17.3c0 11.7 16 27.2 16 27.2s16-15.5 16-27.2C34 8.5 27 1.5 18 1.5z"

const crearIcono = (relleno: string, borde: string, discontinuo: boolean, escala = 1) => {
  const ancho = Math.round(36 * escala)
  const alto = Math.round(46 * escala)
  return L.divIcon({
    className: "mapa-marcador",
    html: `<svg width="${ancho}" height="${alto}" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));"><path d="${FORMA}" fill="${relleno}" stroke="${borde}" stroke-width="2.5"${discontinuo ? ' stroke-dasharray="4 3"' : ""}/><circle cx="18" cy="17" r="6" fill="${discontinuo ? borde : "white"}"/></svg>`,
    iconSize: [ancho, alto],
    iconAnchor: [ancho / 2, alto - 1],
  })
}

export default function MapaPuntosInteres({
  puntos,
  elegida,
  seleccionado,
  enfocado,
  alTocarMapa,
  alElegirPunto,
  ampliado = false,
  alAlternarAmpliado,
  desplazamiento = 0,
}: MapaPuntosInteresProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const capaPuntos = useRef<L.LayerGroup | null>(null)
  const capaElegida = useRef<L.LayerGroup | null>(null)
  const marcadores = useRef<Map<string, L.Marker>>(new Map())
  const ultimaClave = useRef<string | null>(null)
  const alTocar = useRef(alTocarMapa)
  const alElegir = useRef(alElegirPunto)
  const margen = useRef(desplazamiento)

  useEffect(() => {
    alTocar.current = alTocarMapa
    alElegir.current = alElegirPunto
    margen.current = desplazamiento
  }, [alTocarMapa, alElegirPunto, desplazamiento])

  useEffect(() => {
    if (!contenedor.current) return
    const nuevo = L.map(contenedor.current, { scrollWheelZoom: false, worldCopyJump: false })
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: ATRIBUCION }).addTo(nuevo)
    capaPuntos.current = L.layerGroup().addTo(nuevo)
    capaElegida.current = L.layerGroup().addTo(nuevo)
    mapa.current = nuevo
    nuevo.on("click", (evento: L.LeafletMouseEvent) => {
      alTocar.current({ latitud: evento.latlng.lat, longitud: evento.latlng.lng })
    })
    const alRedimensionar = () => nuevo.invalidateSize()
    window.addEventListener("resize", alRedimensionar)
    return () => {
      window.removeEventListener("resize", alRedimensionar)
      nuevo.remove()
      mapa.current = null
      capaPuntos.current = null
      capaElegida.current = null
      marcadores.current = new Map()
      ultimaClave.current = null
    }
  }, [])

  useEffect(() => {
    mapa.current?.invalidateSize()
  }, [ampliado])

  const clavePuntos = JSON.stringify(puntos)

  useEffect(() => {
    const actual = mapa.current
    const capa = capaPuntos.current
    if (!actual || !capa) return
    const lista: PuntoInteres[] = JSON.parse(clavePuntos)
    const cambiaronLosPuntos = ultimaClave.current !== clavePuntos
    ultimaClave.current = clavePuntos
    capa.clearLayers()
    marcadores.current = new Map()
    lista.forEach((punto) => {
      const elegido = punto.id === seleccionado
      const marcador = L.marker([punto.latitud, punto.longitud], {
        icon: elegido ? crearIcono(C.navy, "white", false, 1.3) : crearIcono(C.accent, "white", false),
        title: punto.nombre,
        alt: punto.nombre,
        zIndexOffset: elegido ? 1000 : 0,
      })
        .on("click", () => alElegir.current(punto.id))
        .addTo(capa)
      marcadores.current.set(punto.id, marcador)
    })
    if (!cambiaronLosPuntos) return
    if (lista.length === 0) {
      actual.setView([25, 10], 2)
      return
    }
    if (lista.length === 1) {
      actual.setView([lista[0].latitud, lista[0].longitud], 15)
      return
    }
    actual.fitBounds(L.latLngBounds(lista.map((punto) => [punto.latitud, punto.longitud] as [number, number])), {
      padding: [36, 36],
      maxZoom: 16,
    })
  }, [clavePuntos, seleccionado])

  const claveElegida = JSON.stringify(elegida)

  useEffect(() => {
    const actual = mapa.current
    const capa = capaElegida.current
    if (!actual || !capa) return
    capa.clearLayers()
    const ubicacion: UbicacionElegida | null = JSON.parse(claveElegida)
    if (!ubicacion) return
    L.marker([ubicacion.latitud, ubicacion.longitud], {
      icon: crearIcono("white", C.accent, true),
      title: "Ubicación elegida",
      alt: "Ubicación elegida",
      interactive: false,
    }).addTo(capa)
    moverA(actual, L.latLng(ubicacion.latitud, ubicacion.longitud), margen.current)
  }, [claveElegida])

  useEffect(() => {
    if (!enfocado) return
    const marcador = marcadores.current.get(enfocado.id)
    const actual = mapa.current
    if (!marcador || !actual) return
    moverA(actual, marcador.getLatLng(), margen.current)
  }, [enfocado])

  return (
    <div style={{ position: "relative", width: "100%", ...(ampliado ? { flex: 1, minHeight: 0 } : { height: ALTO_MAPA_PUNTOS }) }}>
      <div
        ref={contenedor}
        role="region"
        aria-label="Mapa de los puntos de interés"
        style={{ position: "absolute", inset: 0, background: C.lightBlue }}
      />
      {alAlternarAmpliado && (
        <button
          type="button"
          onClick={alAlternarAmpliado}
          aria-label={ampliado ? "Reducir mapa" : "Ampliar mapa"}
          aria-expanded={ampliado}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1100,
            width: 44,
            height: 44,
            borderRadius: 12,
            border: `1.5px solid ${C.border}`,
            background: "white",
            boxShadow: SHADOWS.card,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Icon name={ampliado ? "compress" : "expand"} size={20} color={C.navy} strokeWidth={2.2} />
        </button>
      )}
    </div>
  )
}
