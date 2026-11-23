// Test unitario de la lectura del resumen del viaje: el presupuesto restante (PB-61)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { obtenerResumenDelViaje } from '../src/services/resumenApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respondeCon = (cuerpo: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'Content-Type': 'application/json' } }))),
  )

const base = { dias: 4, actividad_mas_votada: null, alma_del_grupo: null }

afterEach(() => vi.unstubAllGlobals())

describe('obtenerResumenDelViaje (presupuesto restante)', () => {
  it('devuelve el presupuesto restante tal como llega del backend', async () => {
    respondeCon({ ...base, presupuesto: { total: 1240, gastado: 300, restante: 940 } })

    const resumen = await obtenerResumenDelViaje(VIAJE_ID, 'token-acceso')

    expect(resumen.presupuesto).toEqual({ total: 1240, gastado: 300, restante: 940 })
  })

  it('un resumen sin presupuesto (respuesta anterior) devuelve presupuesto null', async () => {
    respondeCon(base)

    const resumen = await obtenerResumenDelViaje(VIAJE_ID, 'token-acceso')

    expect(resumen.presupuesto).toBeNull()
  })

  it('rechaza un presupuesto cuyo restante no es un número', async () => {
    respondeCon({ ...base, presupuesto: { total: 1240, gastado: 300, restante: 'mucho' } })

    await expect(obtenerResumenDelViaje(VIAJE_ID, 'token-acceso')).rejects.toThrow('Respuesta del resumen no válida')
  })
})
