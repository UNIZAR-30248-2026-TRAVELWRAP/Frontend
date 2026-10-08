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

  it('devuelve null si el contenido guardado está corrupto', () => {
    localStorage.setItem('travelwrap.sesion', '{no es json')
    expect(leerSesion()).toBeNull()
  })
})
