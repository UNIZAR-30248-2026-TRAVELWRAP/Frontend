import { describe, expect, it } from 'vitest'
import { diasDelViaje } from '../src/utils/formatoViaje'

describe('diasDelViaje', () => {
  it('lista cada día del viaje con su fecha y su texto', () => {
    expect(diasDelViaje('2027-05-12', '2027-05-14')).toEqual([
      { fecha: '2027-05-12', texto: 'Día 1 · 12 may' },
      { fecha: '2027-05-13', texto: 'Día 2 · 13 may' },
      { fecha: '2027-05-14', texto: 'Día 3 · 14 may' },
    ])
  })

  it('devuelve un solo día si el viaje empieza y acaba el mismo día', () => {
    expect(diasDelViaje('2027-05-12', '2027-05-12')).toEqual([{ fecha: '2027-05-12', texto: 'Día 1 · 12 may' }])
  })

  it('cruza el cambio de mes y de año', () => {
    const dias = diasDelViaje('2027-12-30', '2028-01-02')

    expect(dias.map((dia) => dia.fecha)).toEqual(['2027-12-30', '2027-12-31', '2028-01-01', '2028-01-02'])
    expect(dias[3].texto).toBe('Día 4 · 2 ene')
  })

  it('no devuelve días si el fin es anterior al inicio', () => {
    expect(diasDelViaje('2027-05-15', '2027-05-12')).toEqual([])
  })
})
