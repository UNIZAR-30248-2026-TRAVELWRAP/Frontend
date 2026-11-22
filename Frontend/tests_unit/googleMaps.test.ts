import { describe, expect, it } from 'vitest'
import { MAX_PARADAS_GOOGLE_MAPS, urlDeGoogleMaps } from '../src/utils/googleMaps'

const parada = (n: number) => ({ latitud: 41 + n / 100, longitud: 12 + n / 100 })
const parametros = (url: string) => new URL(url).searchParams

describe('urlDeGoogleMaps', () => {
  it('con dos paradas pone la primera de origen y la segunda de destino, a pie y sin paradas intermedias', () => {
    const url = urlDeGoogleMaps([parada(1), parada(2)])

    expect(url.startsWith('https://www.google.com/maps/dir/?')).toBe(true)
    const datos = parametros(url)
    expect(datos.get('api')).toBe('1')
    expect(datos.get('origin')).toBe('41.01,12.01')
    expect(datos.get('destination')).toBe('41.02,12.02')
    expect(datos.get('travelmode')).toBe('walking')
    expect(datos.has('waypoints')).toBe(false)
  })

  it('con más paradas las intermedias van en orden separadas por barras', () => {
    const datos = parametros(urlDeGoogleMaps([parada(1), parada(2), parada(3), parada(4)]))

    expect(datos.get('origin')).toBe('41.01,12.01')
    expect(datos.get('waypoints')).toBe('41.02,12.02|41.03,12.03')
    expect(datos.get('destination')).toBe('41.04,12.04')
  })

  it('con más de 11 paradas se queda con las 11 primeras', () => {
    const muchas = Array.from({ length: 14 }, (_, i) => parada(i + 1))
    const datos = parametros(urlDeGoogleMaps(muchas))

    expect(MAX_PARADAS_GOOGLE_MAPS).toBe(11)
    expect(datos.get('origin')).toBe('41.01,12.01')
    expect(datos.get('destination')).toBe('41.11,12.11')
    expect(datos.get('waypoints')?.split('|')).toHaveLength(9)
  })
})
