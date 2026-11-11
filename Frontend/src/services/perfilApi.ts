import { peticion, type Usuario } from "./authApi"

type RespuestaPerfil = { usuario: Usuario }

// Cambia el nombre del usuario de la sesión. El backend quita los espacios de los extremos
export const actualizarNombre = (nombre: string, tokenSesion: string) =>
  peticion<RespuestaPerfil>("/perfil", { metodo: "PATCH", cuerpo: { nombre }, token: tokenSesion }).then((r) => r.usuario)

// Sube la foto de perfil (JPEG o PNG, de hasta 2 MB). Devuelve el usuario con su nueva avatar_url
export const subirAvatar = (archivo: Blob, tokenSesion: string) => {
  const formulario = new FormData()
  formulario.append("avatar", archivo, archivo.type === "image/png" ? "avatar.png" : "avatar.jpg")
  return peticion<RespuestaPerfil>("/perfil/avatar", { metodo: "PUT", formulario, token: tokenSesion }).then(
    (r) => r.usuario,
  )
}

// Quita la foto de perfil: avatar_url queda en null
export const quitarAvatar = (tokenSesion: string) =>
  peticion<RespuestaPerfil>("/perfil/avatar", { metodo: "DELETE", token: tokenSesion }).then((r) => r.usuario)
