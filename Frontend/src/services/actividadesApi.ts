import { peticion } from "./authApi"

export type Categoria = "comida" | "cultura" | "transporte" | "alojamiento" | "otro"

export const CATEGORIAS: { valor: Categoria; texto: string; icono: string }[] = [
  { valor: "comida", texto: "Comida", icono: "restaurant" },
  { valor: "cultura", texto: "Cultura", icono: "gallery" },
  { valor: "transporte", texto: "Transporte", icono: "car" },
  { valor: "alojamiento", texto: "Alojamiento", icono: "house" },
  { valor: "otro", texto: "Otro", icono: "pin" },
]

export const iconoDeCategoria = (categoria: string | null) =>
  CATEGORIAS.find((c) => c.valor === categoria)?.icono ?? "pin"

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
  categoria: Categoria | null
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
  categoria: Categoria | null
}

export const listarActividades = (viajeId: string, tokenSesion: string, fecha?: string) =>
  peticion<{ actividades: Actividad[] }>(
    `/viajes/${encodeURIComponent(viajeId)}/actividades${fecha ? `?fecha=${encodeURIComponent(fecha)}` : ""}`,
    { token: tokenSesion },
  )

export type CambiosActividad = Partial<NuevaActividad>

export const editarActividad = (viajeId: string, actividadId: string, cambios: CambiosActividad, tokenSesion: string) =>
  peticion<Actividad>(`/viajes/${encodeURIComponent(viajeId)}/actividades/${encodeURIComponent(actividadId)}`, {
    metodo: "PATCH",
    cuerpo: cambios,
    token: tokenSesion,
  })

export const eliminarActividad = (viajeId: string, actividadId: string, tokenSesion: string) =>
  peticion<null>(`/viajes/${encodeURIComponent(viajeId)}/actividades/${encodeURIComponent(actividadId)}`, {
    metodo: "DELETE",
    token: tokenSesion,
  })

export const crearActividad = (viajeId: string, actividad: NuevaActividad, tokenSesion: string) =>
  peticion<Actividad>(`/viajes/${encodeURIComponent(viajeId)}/actividades`, {
    metodo: "POST",
    cuerpo: actividad,
    token: tokenSesion,
  })
