import { beforeEach, describe, expect, it } from 'vitest'
import { borrarSesion, guardarSesion, leerSesion } from '../src/services/sesionStorage'

const sesion = {
  usuario: {
    id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
    nombre: 'Daniel',
    email: 'daniel@travelwrap.app',
    avatar_url: null,
    creado_en: '2026-10-06T15:29:32Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
}

beforeEach(() => {
  localStorage.clear()
})

describe('sesionStorage', () => {
  it('devuelve null si no hay sesión guardada', () => {
    expect(leerSesion()).toBeNull()
  })

  it('guarda y recupera la sesión', () => {
    guardarSesion(sesion)
    expect(leerSesion()).toEqual(sesion)
  })

  it('borra la sesión guardada', () => {
    guardarSesion(sesion)
    borrarSesion()
    expect(leerSesion()).toBeNull()
  })

  it('guarda la foto de perfil y fechas con fracciones de segundo y zona horaria', () => {
    const conFoto = {
      ...sesion,
      usuario: { ...sesion.usuario, avatar_url: 'https://lh3.googleusercontent.com/a/foto', creado_en: '2026-10-06T15:29:32.123456+00:00' },
      token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.firma_-x',
    }
    guardarSesion(conFoto)
    expect(leerSesion()).toEqual(conFoto)
  })

  it('guarda solo los campos esperados de la sesión', () => {
    guardarSesion({ ...sesion, extra: 'no se guarda', usuario: { ...sesion.usuario, rol: 'admin' } } as never)
    expect(leerSesion()).toEqual(sesion)
  })

  it.each([
    ['un token con caracteres no válidos', { ...sesion, token: 'token "con" comillas' }],
    ['un usuario sin identificador', { ...sesion, usuario: { ...sesion.usuario, id: '' } }],
    ['un email no válido', { ...sesion, usuario: { ...sesion.usuario, email: 'sin arroba' } }],
    ['una foto de perfil que no es una URL', { ...sesion, usuario: { ...sesion.usuario, avatar_url: 'javascript:alert(1)' } }],
  ])('no guarda una sesión con %s', (_caso, sesionNoValida) => {
    guardarSesion(sesionNoValida)
    expect(localStorage.getItem('travelwrap.sesion')).toBeNull()
  })

  it('no devuelve una sesión guardada con un formato no válido', () => {
    localStorage.setItem('travelwrap.sesion', JSON.stringify({ ...sesion, token: 42 }))
    expect(leerSesion()).toBeNull()
  })

  it('devuelve null si el contenido guardado está corrupto', () => {
    localStorage.setItem('travelwrap.sesion', '{no es json')
    expect(leerSesion()).toBeNull()
  })
})
