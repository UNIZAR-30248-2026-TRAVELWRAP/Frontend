import { afterEach, describe, expect, it, vi } from 'vitest'
import { borrarItinerario, borrarItinerarios, guardarItinerario, leerItinerario } from '../src/services/itinerarioGuardado'

// Itinerario completo, como lo devuelve la API
const itinerario = (id: string) => ({
  viaje: {
    id,
    nombre: 'Roma 2027',
    destino: 'Roma',
    descripcion: null,
    fecha_inicio: '2027-05-12',
    fecha_fin: '2027-05-14',
    moneda: 'EUR',
    presupuesto: 850,
    estado: 'activo' as const,
    creado_en: '2026-10-12T10:00:00Z',
    pendiente_destino: false,
    portada_url: null,
    rol: 'miembro' as const,
    archivado: false,
    miembros: [{ usuario_id: 'u1', nombre: 'Berta', avatar_url: null, rol: 'creador' as const }],
  },
  actividades: [
    {
      id: 'a1',
      viaje_id: id,
      titulo: 'Coliseo',
      descripcion: null,
      fecha: '2027-05-12',
      hora_inicio: '10:00:00',
      hora_fin: null,
      orden: 1,
      ubicacion_nombre: 'Piazza del Colosseo',
      latitud: 41.890251,
      longitud: 12.492373,
      lugar_externo_id: null,
      categoria: 'cultura' as const,
      creado_por: 'u1',
      creado_en: '2026-10-20T10:00:00.123456+00:00',
      actualizado_en: '2026-10-20T10:00:00.123456+00:00',
    },
  ],
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

  it('guarda si el usuario tiene el viaje archivado', () => {
    const archivado = itinerario('roma')
    archivado.viaje.archivado = true

    guardarItinerario('roma', archivado)

    expect(leerItinerario('roma')?.viaje.archivado).toBe(true)
  })

  it('una copia guardada antes de MEJ-12, sin archivado, se sigue leyendo como no archivada', () => {
    const { archivado: _archivado, ...viajeAntiguo } = itinerario('roma').viaje
    localStorage.setItem(
      'travelwrap.itinerario.roma',
      JSON.stringify({ ...itinerario('roma'), viaje: viajeAntiguo }),
    )

    const copia = leerItinerario('roma')

    expect(copia?.viaje.archivado).toBe(false)
    expect(copia?.viaje.nombre).toBe('Roma 2027')
  })

  it('borra solo la copia del viaje indicado', () => {
    guardarItinerario('roma', itinerario('roma'))
    guardarItinerario('lisboa', itinerario('lisboa'))
    localStorage.setItem('otra.clave', 'valor')

    borrarItinerario('roma')

    expect(leerItinerario('roma')).toBeNull()
    expect(leerItinerario('lisboa')?.viaje.id).toBe('lisboa')
    expect(localStorage.getItem('otra.clave')).toBe('valor')
  })

  it('borrar la copia de un viaje que no existe o con un identificador no válido no falla', () => {
    expect(() => borrarItinerario('roma')).not.toThrow()
    expect(() => borrarItinerario('')).not.toThrow()
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


  it('guarda solo los campos esperados', () => {
    const conDeMas = itinerario('roma')
    Object.assign(conDeMas.viaje, { campo_extra: 'no se guarda' })
    Object.assign(conDeMas.actividades[0], { script: '<script>' })

    guardarItinerario('roma', conDeMas)

    expect(leerItinerario('roma')).toEqual(itinerario('roma'))
  })


  it.each([
    ['un estado del viaje que no existe', (d: ReturnType<typeof itinerario>) => Object.assign(d.viaje, { estado: 'borrado' })],
    ['el estado archivado, que ya no existe', (d: ReturnType<typeof itinerario>) => Object.assign(d.viaje, { estado: 'archivado' })],
    ['un archivado que no es booleano', (d: ReturnType<typeof itinerario>) => Object.assign(d.viaje, { archivado: 'si' })],
    ['una fecha con otro formato', (d: ReturnType<typeof itinerario>) => Object.assign(d.actividades[0], { fecha: '12/05/2027' })],
    ['una categoría que no existe', (d: ReturnType<typeof itinerario>) => Object.assign(d.actividades[0], { categoria: 'fiesta' })],
    ['un miembro sin identificador', (d: ReturnType<typeof itinerario>) => Object.assign(d.viaje.miembros[0], { usuario_id: '' })],
    ['una foto de perfil que no es una URL', (d: ReturnType<typeof itinerario>) => Object.assign(d.viaje.miembros[0], { avatar_url: 'javascript:alert(1)' })],
  ])('no guarda nada si el itinerario tiene %s', (_caso, estropear) => {
    const datos = itinerario('roma')
    estropear(datos)

    guardarItinerario('roma', datos)

    expect(localStorage.getItem('travelwrap.itinerario.roma')).toBeNull()
  })


})
