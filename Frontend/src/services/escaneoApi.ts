import { peticion } from "./authApi"

// Datos que el backend lee de un ticket
export type DatosGastoEscaneado = {
  concepto: string | null
  importe: number | null
}

// Datos que el backend lee de una reserva, entrada, vuelo o cita. fecha es AAAA-MM-DD o null si el documento no trae el año
export type DatosActividadEscaneada = {
  titulo: string | null
  fecha: string | null
  hora_inicio: string | null
  // Dirección o lugar de la reserva, y su categoría (null si no se reconocen)
  ubicacion_nombre: string | null
  categoria: "comida" | "cultura" | "transporte" | "alojamiento" | "otro" | null
}

// Resumen del texto de cualquier otro documento
export type DatosOtroEscaneado = {
  resumen: string
}

// Lo que devuelve el escaneo: el tipo detectado y sus datos para la pantalla de confirmación de ese tipo
// foto_ruta: ruta de la foto guardada para el gasto o la actividad (null si no se guarda, como en un resumen de texto)
export type ResultadoEscaneo =
  | { tipo: "gasto"; datos: DatosGastoEscaneado; foto_ruta: string | null }
  | { tipo: "actividad"; datos: DatosActividadEscaneada; foto_ruta: string | null }
  | { tipo: "otro"; datos: DatosOtroEscaneado; foto_ruta: null }

// Lee la foto de un documento con OCR y devuelve su tipo. No guarda nada: la app confirma después
export const escanearDocumento = (viajeId: string, foto: File, tokenSesion: string) => {
  const formulario = new FormData()
  formulario.append("archivo", foto)
  return peticion<ResultadoEscaneo>(`/viajes/${encodeURIComponent(viajeId)}/gastos/escaneo`, {
    metodo: "POST",
    formulario,
    token: tokenSesion,
  })
}
