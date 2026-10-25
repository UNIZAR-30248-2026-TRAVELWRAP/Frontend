import { afterEach, describe, expect, it, vi } from 'vitest'
import { borrarItinerarios, guardarItinerario, leerItinerario } from '../src/services/itinerarioGuardado'
import { borrarSesion, guardarSesion, leerSesion } from '../src/services/sesionStorage'

const itinerario = (id: string) => ({
  viaje: { id, nombre: 'Roma 2027' } as never,
  actividades: [{ id: 'a1', titulo: 'Coliseo' }] as never,
  guardadoEn: '2026-10-25T10:00:00.000Z',
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('itinerarioGuardado', () => {
  it('guarda y lee el itinerario de un viaje', () => {
    guardarItinerario('roma', itinerario('roma'))

    expect(leerItinerario('roma')).toEqual(itinerario('roma'))
  })

  it('guarda cada viaje por separado', () => {
    guardarItinerario('roma', itinerario('roma'))
    guardarItinerario('lisboa', itinerario('lisboa'))

    expect(leerItinerario('roma')?.viaje.id).toBe('roma')
    expect(leerItinerario('lisboa')?.viaje.id).toBe('lisboa')
  })

  it('devuelve null si no hay nada guardado', () => {
    expect(leerItinerario('roma')).toBeNull()
  })

  it('devuelve null si lo guardado está estropeado o incompleto', () => {
    localStorage.setItem('travelwrap.itinerario.roma', '{no es json')
    localStorage.setItem('travelwrap.itinerario.lisboa', JSON.stringify({ viaje: { id: 'lisboa' } }))

    expect(leerItinerario('roma')).toBeNull()
    expect(leerItinerario('lisboa')).toBeNull()
  })

  it('borra todos los itinerarios sin tocar el resto del almacenamiento', () => {
    guardarItinerario('roma', itinerario('roma'))
    guardarItinerario('lisboa', itinerario('lisboa'))
    localStorage.setItem('otra.clave', 'valor')

    borrarItinerarios()

    expect(leerItinerario('roma')).toBeNull()
    expect(leerItinerario('lisboa')).toBeNull()
    expect(localStorage.getItem('otra.clave')).toBe('valor')
  })

  it('no falla si el navegador no deja escribir ni leer', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cuota llena')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    expect(() => guardarItinerario('roma', itinerario('roma'))).not.toThrow()
    expect(leerItinerario('roma')).toBeNull()
  })

  it('al cerrar la sesión se borran los itinerarios guardados', () => {
    guardarSesion({ usuario: { id: 'u1' }, token: 't', refresh_token: 'r' } as never)
    guardarItinerario('roma', itinerario('roma'))

    borrarSesion()

    expect(leerSesion()).toBeNull()
    expect(leerItinerario('roma')).toBeNull()
  })
})
