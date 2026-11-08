import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "./MapaActividades.css"
import { C } from "../styles/tokens"

export type PuntoDelMapa = {
  id: string
  titulo: string
  ubicacion: string | null
  latitud: number
  longitud: number
}

type MapaActividadesProps = {
  puntos: PuntoDelMapa[]
}

export const ALTO_MAPA = 220

const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const crearIcono = (numero: number) =>
  L.divIcon({
    className: "mapa-marcador",
    html: `<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));"><path d="M18 1.5C9 1.5 2 8.5 2 17.3c0 11.7 16 27.2 16 27.2s16-15.5 16-27.2C34 8.5 27 1.5 18 1.5z" fill="${numero === 1 ? C.accent : C.blue}" stroke="white" stroke-width="2.5"/><text x="18" y="23" text-anchor="middle" fill="white" font-size="15" font-weight="800" font-family="Nunito, sans-serif">${numero}</text></svg>`,
    iconSize: [36, 46],
    iconAnchor: [18, 45],
    popupAnchor: [0, -42],
  })

const crearPopup = (punto: PuntoDelMapa) => {
  const contenido = document.createElement("div")
  const titulo = document.createElement("strong")
  titulo.textContent = punto.titulo
  contenido.appendChild(titulo)
  if (punto.ubicacion) {
    const ubicacion = document.createElement("div")
    ubicacion.textContent = punto.ubicacion
    contenido.appendChild(ubicacion)
  }
  return contenido
}

export default function MapaActividades({ puntos }: MapaActividadesProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const marcadores = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!contenedor.current) return
    const nuevo = L.map(contenedor.current, { scrollWheelZoom: false, worldCopyJump: false })
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: ATRIBUCION }).addTo(nuevo)
    marcadores.current = L.layerGroup().addTo(nuevo)
    mapa.current = nuevo
    return () => {
      nuevo.remove()
      mapa.current = null
      marcadores.current = null
    }
  }, [])

  const clave = JSON.stringify(puntos)

  useEffect(() => {
    const actual = mapa.current
    const capa = marcadores.current
    if (!actual || !capa) return
    const puntos: PuntoDelMapa[] = JSON.parse(clave)
    capa.clearLayers()
    if (puntos.length === 0) {
      actual.setView([25, 10], 2)
      return
    }
    puntos.forEach((punto, indice) => {
      L.marker([punto.latitud, punto.longitud], {
        icon: crearIcono(indice + 1),
        title: `${indice + 1}. ${punto.titulo}`,
        alt: `${indice + 1}. ${punto.titulo}`,
      })
        .bindPopup(crearPopup(punto))
        .addTo(capa)
    })
    if (puntos.length >= 2) {
      L.polyline(
        puntos.map((punto) => [punto.latitud, punto.longitud] as [number, number]),
        { color: C.blue, weight: 4, opacity: 0.7, dashArray: "8 8", interactive: false },
      ).addTo(capa)
    }
    if (puntos.length === 1) {
      actual.setView([puntos[0].latitud, puntos[0].longitud], 15)
      return
    }
    actual.fitBounds(L.latLngBounds(puntos.map((punto) => [punto.latitud, punto.longitud] as [number, number])), {
      padding: [36, 36],
      maxZoom: 16,
    })
  }, [clave])

  return (
    <div
      ref={contenedor}
      role="region"
      aria-label="Mapa de las actividades del día"
      style={{ height: ALTO_MAPA, width: "100%", background: C.lightBlue }}
    />
  )
}
