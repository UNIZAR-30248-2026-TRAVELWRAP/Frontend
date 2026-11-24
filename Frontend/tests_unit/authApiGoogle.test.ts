import { describe, expect, it } from 'vitest'
import { URL_LOGIN_GOOGLE, leerResultadoGoogle } from '../src/services/authApi'

const sesion = {
  usuario: {
    id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
    nombre: 'José Muñoz Peña',
    email: 'jose@gmail.com',
    avatar_url: 'https://lh3.googleusercontent.com/a/foto',
    creado_en: '2026-10-08T10:00:00Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
}

const codificar = (valor: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(valor))
  const binario = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('URL_LOGIN_GOOGLE', () => {
  it('apunta al endpoint /auth/google del backend', () => {
    expect(URL_LOGIN_GOOGLE).toMatch(/\/api\/auth\/google$/)
  })
})

describe('leerResultadoGoogle', () => {
  it('devuelve la sesión enviada por el backend en el fragmento', () => {
    expect(leerResultadoGoogle(`#sesion=${codificar(sesion)}`)).toEqual({ sesion })
  })

  it('acepta el fragmento sin la almohadilla inicial', () => {
    expect(leerResultadoGoogle(`sesion=${codificar(sesion)}`)).toEqual({ sesion })
  })

  it('conserva los caracteres con tilde y eñe del nombre', () => {
    const resultado = leerResultadoGoogle(`#sesion=${codificar(sesion)}`)
    expect('sesion' in resultado && resultado.sesion.usuario.nombre).toBe('José Muñoz Peña')
  })

  it('devuelve el mensaje de cancelación si el usuario cancela en Google', () => {
    expect(leerResultadoGoogle('#error=google_cancelado')).toEqual({
      error: 'Has cancelado el inicio de sesión con Google',
    })
  })

  it('devuelve el mensaje genérico si el backend informa de un error', () => {
    expect(leerResultadoGoogle('#error=google')).toEqual({
      error: 'No se ha podido iniciar sesión con Google',
    })
  })


  it('devuelve el mensaje genérico si el fragmento está vacío', () => {
    expect(leerResultadoGoogle('')).toEqual({
      error: 'No se ha podido iniciar sesión con Google',
    })
  })


})
