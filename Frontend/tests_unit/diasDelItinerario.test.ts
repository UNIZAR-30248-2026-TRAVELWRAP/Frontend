import { describe, expect, it } from 'vitest'
import { diasDelItinerario } from '../src/utils/formatoViaje'

describe('diasDelItinerario', () => {
  it('con las fechas del viaje lista sus días numerados', () => {
    expect(diasDelItinerario('2027-05-12', '2027-05-13', [])).toEqual([
      { fecha: '2027-05-12', texto: 'Día 1 · 12 may' },
      { fecha: '2027-05-13', texto: 'Día 2 · 13 may' },
    ])
  })

  it('no repite los días del viaje que ya tienen actividades', () => {
    const dias = diasDelItinerario('2027-05-12', '2027-05-13', ['2027-05-13', '2027-05-13', '2027-05-12'])

    expect(dias.map((dia) => dia.fecha)).toEqual(['2027-05-12', '2027-05-13'])
  })

  it('añade, ordenados, los días de actividades que caen fuera del rango del viaje', () => {
    const dias = diasDelItinerario('2027-05-12', '2027-05-13', ['2027-05-20', '2027-05-10'])

    expect(dias).toEqual([
      { fecha: '2027-05-10', texto: '10 may' },
      { fecha: '2027-05-12', texto: 'Día 1 · 12 may' },
      { fecha: '2027-05-13', texto: 'Día 2 · 13 may' },
      { fecha: '2027-05-20', texto: '20 may' },
    ])
  })

  it('sin fechas en el viaje usa solo los días de las actividades', () => {
    expect(diasDelItinerario(null, null, ['2027-06-02', '2027-06-01', '2027-06-02'])).toEqual([
      { fecha: '2027-06-01', texto: '1 jun' },
      { fecha: '2027-06-02', texto: '2 jun' },
    ])
  })

  it('con solo una de las dos fechas del viaje tampoco inventa el rango', () => {
    expect(diasDelItinerario('2027-05-12', null, [])).toEqual([])
  })

  it('sin fechas ni actividades no hay días', () => {
    expect(diasDelItinerario(null, null, [])).toEqual([])
  })
})
