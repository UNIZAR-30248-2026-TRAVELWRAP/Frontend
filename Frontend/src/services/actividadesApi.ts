import { peticion } from "./authApi"

export type Actividad = {
  id: string
  viaje_id: string
  titulo: string
  descripcion: string | null
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  orden: number
  ubicacion_nombre: string | null
  latitud: number | null
  longitud: number | null
  lugar_externo_id: string | null
  categoria: string | null
  creado_por: string | null
  creado_en: string
  actualizado_en: string
}

export type NuevaActividad = {
  titulo: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  ubicacion_nombre: string | null
}

export const listarActividades = (viajeId: string, tokenSesion: string, fecha?: string) =>
  peticion<{ actividades: Actividad[] }>(
    `/viajes/${encodeURIComponent(viajeId)}/actividades${fecha ? `?fecha=${encodeURIComponent(fecha)}` : ""}`,
    { token: tokenSesion },
  )

export const crearActividad = (viajeId: string, actividad: NuevaActividad, tokenSesion: string) =>
  peticion<Actividad>(`/viajes/${encodeURIComponent(viajeId)}/actividades`, {
    metodo: "POST",
    cuerpo: actividad,
    token: tokenSesion,
  })
