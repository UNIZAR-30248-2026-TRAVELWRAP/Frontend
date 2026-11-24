// Test unitario de la etiqueta de estado de un viaje activo según sus fechas
import { describe, expect, it } from 'vitest'
import { etiquetaEstadoActivo } from '../src/utils/estadoViaje'

const el = (fecha: string) => new Date(`${fecha}T10:00:00`)

describe('etiquetaEstadoActivo', () => {
  it('un viaje que aún no ha empezado dice cuántos días faltan', () => {
    expect(etiquetaEstadoActivo('2026-12-04', el('2026-11-24'))).toBe('Próximo · faltan 10 días')
  })

  it('el día antes de empezar dice mañana', () => {
    expect(etiquetaEstadoActivo('2026-11-25', el('2026-11-24'))).toBe('Próximo · mañana')
  })

  it('desde el primer día, y durante el viaje, está en curso', () => {
    expect(etiquetaEstadoActivo('2026-11-24', el('2026-11-24'))).toBe('En curso')
    expect(etiquetaEstadoActivo('2026-11-20', el('2026-11-24'))).toBe('En curso')
  })

  it('sin fecha de inicio no se puede saber y se muestra en curso', () => {
    expect(etiquetaEstadoActivo(null, el('2026-11-24'))).toBe('En curso')
  })
})
