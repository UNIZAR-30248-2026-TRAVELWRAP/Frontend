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
  enfocado: { id: string; vez: number } | null
  alTocarMapa?: (ubicacion: UbicacionElegida) => void
  ampliado?: boolean
  alAlternarAmpliado?: () => void
}

export const ALTO_MAPA_PUNTOS = 280

const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const FORMA = "M18 1.5C9 1.5 2 8.5 2 17.3c0 11.7 16 27.2 16 27.2s16-15.5 16-27.2C34 8.5 27 1.5 18 1.5z"

const crearIcono = (relleno: string, borde: string, discontinuo: boolean) =>
  L.divIcon({
    className: "mapa-marcador",
    html: `<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));"><path d="${FORMA}" fill="${relleno}" stroke="${borde}" stroke-width="2.5"${discontinuo ? ' stroke-dasharray="4 3"' : ""}/><circle cx="18" cy="17" r="6" fill="${discontinuo ? borde : "white"}"/></svg>`,
    iconSize: [36, 46],
    iconAnchor: [18, 45],
    popupAnchor: [0, -42],
  })

const crearPopup = (punto: PuntoInteres) => {
  const contenido = document.createElement("div")
  const nombre = document.createElement("strong")
  nombre.textContent = punto.nombre
  contenido.appendChild(nombre)
  if (punto.nota) {
    const nota = document.createElement("div")
    nota.textContent = punto.nota
    contenido.appendChild(nota)
  }
  return contenido
}

export default function MapaPuntosInteres({
  puntos,
  elegida,
  enfocado,
  alTocarMapa,
  ampliado = false,
  alAlternarAmpliado,
}: MapaPuntosInteresProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const capaPuntos = useRef<L.LayerGroup | null>(null)
  const capaElegida = useRef<L.LayerGroup | null>(null)
  const marcadores = useRef<Map<string, L.Marker>>(new Map())
  const alTocar = useRef(alTocarMapa)

  useEffect(() => {
    alTocar.current = alTocarMapa
  }, [alTocarMapa])

  useEffect(() => {
    if (!contenedor.current) return
    const nuevo = L.map(contenedor.current, { scrollWheelZoom: false, worldCopyJump: false })
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: ATRIBUCION }).addTo(nuevo)
    capaPuntos.current = L.layerGroup().addTo(nuevo)
    capaElegida.current = L.layerGroup().addTo(nuevo)
    mapa.current = nuevo
    nuevo.on("click", (evento: L.LeafletMouseEvent) => {
      alTocar.current?.({ latitud: evento.latlng.lat, longitud: evento.latlng.lng })
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
    capa.clearLayers()
    marcadores.current = new Map()
    if (lista.length === 0) {
      actual.setView([25, 10], 2)
      return
    }
    lista.forEach((punto) => {
      const marcador = L.marker([punto.latitud, punto.longitud], {
        icon: crearIcono(C.accent, "white", false),
        title: punto.nombre,
        alt: `Punto de interés: ${punto.nombre}`,
      })
        .bindPopup(crearPopup(punto))
        .addTo(capa)
      marcadores.current.set(punto.id, marcador)
    })
    if (lista.length === 1) {
      actual.setView([lista[0].latitud, lista[0].longitud], 15)
      return
    }
    actual.fitBounds(L.latLngBounds(lista.map((punto) => [punto.latitud, punto.longitud] as [number, number])), {
      padding: [36, 36],
      maxZoom: 16,
    })
  }, [clavePuntos])

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
    actual.setView([ubicacion.latitud, ubicacion.longitud], Math.max(actual.getZoom(), 15))
  }, [claveElegida])

  useEffect(() => {
    if (!enfocado) return
    const marcador = marcadores.current.get(enfocado.id)
    const actual = mapa.current
    if (!marcador || !actual) return
    actual.setView(marcador.getLatLng(), Math.max(actual.getZoom(), 15))
    marcador.openPopup()
  }, [enfocado])

  return (
    <div style={{ position: "relative", width: "100%", ...(ampliado ? { flex: 1, minHeight: 0 } : { height: ALTO_MAPA_PUNTOS }) }}>
      <div
        ref={contenedor}
        role="region"
        aria-label="Mapa de los puntos de interés"
        style={{ position: "absolute", inset: 0, background: C.lightBlue, cursor: alTocarMapa ? "crosshair" : undefined }}
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
