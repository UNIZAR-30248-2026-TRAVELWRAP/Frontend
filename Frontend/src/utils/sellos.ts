import { C } from "../styles/tokens"
import type { DisenoSello } from "../services/sellosApi"

export type InfoDisenoSello = {
  id: DisenoSello
  nombre: string
  // Nombre del icono de IconoColor.tsx
  icono: string
  color: string
  fondo: string
}

// Los cuatro diseños que se pueden elegir, en el orden en que se muestran
export const DISENOS_SELLO: InfoDisenoSello[] = [
  { id: "chincheta", nombre: "Chincheta", icono: "pin", color: C.accent, fondo: C.lightAccent },
  { id: "mapa", nombre: "Mapa", icono: "map", color: C.blue, fondo: C.lightBlue },
  { id: "ruta", nombre: "Ruta", icono: "route", color: C.green, fondo: C.greenBg },
  { id: "avion", nombre: "Avión", icono: "flight", color: C.purple, fondo: C.purpleBg },
]

export const infoDeDiseno = (diseno: DisenoSello) => DISENOS_SELLO.find((d) => d.id === diseno) ?? DISENOS_SELLO[0]

// Texto del sello: el destino y, si se conoce, el año
export const textoDelSello = (destino: string, anio?: number | string | null) =>
  [destino, anio].filter((parte) => parte !== undefined && parte !== null && parte !== "").join(" ")
