const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

export type Usuario = {
  id: string
  nombre: string | null
  email: string
  avatar_url: string | null
  creado_en: string
}

export type Sesion = {
  usuario: Usuario
  token: string
  refresh_token: string
}

export class ApiError extends Error {
  estado: number
  codigo: string

  constructor(estado: number, codigo: string, mensaje: string) {
    super(mensaje)
    this.estado = estado
    this.codigo = codigo
  }
}

const post = async <T>(ruta: string, cuerpo: unknown): Promise<T> => {
  let respuesta: Response
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  } catch {
    throw new ApiError(0, "sin_conexion", "No se puede conectar con el servidor")
  }

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      datos?.error?.codigo ?? "error_desconocido",
      datos?.error?.mensaje ?? "Ha ocurrido un error",
    )
  }
  return datos as T
}

export const login = (email: string, password: string) =>
  post<Sesion>("/auth/login", { email, password })

export const URL_LOGIN_GOOGLE = `${API_URL}/auth/google`

const MENSAJES_GOOGLE: Record<string, string> = {
  google_cancelado: "Has cancelado el inicio de sesión con Google",
  google: "No se ha podido iniciar sesión con Google",
}

export const leerResultadoGoogle = (
  fragmento: string,
): { sesion: Sesion } | { error: string } => {
  const parametros = new URLSearchParams(fragmento.replace(/^#/, ""))
  const codificada = parametros.get("sesion")
  if (codificada) {
    try {
      const base64 = codificada.replace(/-/g, "+").replace(/_/g, "/")
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const sesion = JSON.parse(new TextDecoder().decode(bytes)) as Sesion
      if (sesion?.token && sesion?.refresh_token && sesion?.usuario?.id) return { sesion }
    } catch {
      return { error: MENSAJES_GOOGLE.google }
    }
  }
  const codigo = parametros.get("error") ?? "google"
  return { error: MENSAJES_GOOGLE[codigo] ?? MENSAJES_GOOGLE.google }
}

export const refrescar = (refreshToken: string) =>
  post<Pick<Sesion, "token" | "refresh_token">>("/auth/refresh", {
    refresh_token: refreshToken,
  })
