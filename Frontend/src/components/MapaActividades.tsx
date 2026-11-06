import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "./MapaActividades.css"
import { C, NUNITO } from "../styles/tokens"

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
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${numero === 1 ? C.accent : C.blue};color:white;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-family:${NUNITO};font-size:13px;font-weight:800;">${numero}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
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
    puntos.forEach((punto, indice) => {
      L.marker([punto.latitud, punto.longitud], {
        icon: crearIcono(indice + 1),
        title: `${indice + 1}. ${punto.titulo}`,
        alt: `${indice + 1}. ${punto.titulo}`,
      })
        .bindPopup(crearPopup(punto))
        .addTo(capa)
    })
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
