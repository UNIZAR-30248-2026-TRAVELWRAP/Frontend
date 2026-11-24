import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SelectorSello from '../src/components/SelectorSello'
import { ApiError } from '../src/services/authApi'
import type { DisenoSello } from '../src/services/sellosApi'

afterEach(() => cleanup())

const montar = (actual: DisenoSello | null = null, onGuardar = vi.fn().mockResolvedValue(undefined)) => {
  const onCerrar = vi.fn()
  render(<SelectorSello destino="Roma" anio={2027} actual={actual} onGuardar={onGuardar} onCerrar={onCerrar} />)
  return { onGuardar, onCerrar }
}

describe('SelectorSello', () => {
  it('muestra los cuatro diseños personalizados con el destino y el año', () => {
    montar()

    expect(screen.getByText('Elige tu sello de Roma')).toBeTruthy()
    for (const nombre of ['Sello 1: Chincheta', 'Sello 2: Mapa', 'Sello 3: Ruta', 'Sello 4: Avión']) {
      expect(screen.getByRole('button', { name: nombre })).toBeTruthy()
    }
    expect(screen.getAllByRole('img', { name: 'Sello de Roma 2027' })).toHaveLength(4)
  })

  it('marca el diseño elegido y desmarca el anterior', async () => {
    const usuario = userEvent.setup()
    montar('mapa')
    expect(screen.getByRole('button', { name: 'Sello 2: Mapa' }).getAttribute('aria-pressed')).toBe('true')

    await usuario.click(screen.getByRole('button', { name: 'Sello 4: Avión' }))

    expect(screen.getByRole('button', { name: 'Sello 4: Avión' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Sello 2: Mapa' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('«Deseleccionar todos» deja ninguno marcado y el botón pasa a «Ningún sello seleccionado»', async () => {
    const usuario = userEvent.setup()
    montar('ruta')

    await usuario.click(screen.getByRole('button', { name: 'Deseleccionar todos' }))

    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    expect((screen.getByRole('button', { name: 'Ningún sello seleccionado' }) as HTMLButtonElement).disabled).toBe(true)
  })





  it('si falla, muestra el error, no cierra y deja volver a intentarlo', async () => {
    const usuario = userEvent.setup()
    const onGuardar = vi.fn().mockRejectedValue(new ApiError(409, 'viaje_no_terminado', 'El viaje todavía no ha terminado'))
    const { onCerrar } = montar(null, onGuardar)

    await usuario.click(screen.getByRole('button', { name: 'Sello 1: Chincheta' }))
    await usuario.click(screen.getByRole('button', { name: 'Elegir' }))

    expect((await screen.findByRole('alert')).textContent).toContain('El viaje todavía no ha terminado')
    expect(onCerrar).not.toHaveBeenCalled()
  })
})
