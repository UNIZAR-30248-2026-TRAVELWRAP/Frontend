import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import AvisoConexion from '../src/components/AvisoConexion'
import { avisarSinConexion } from '../src/services/avisosRed'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const avisar = () => act(() => avisarSinConexion())

describe('AvisoConexion', () => {
  it('no se ve hasta que una petición no consigue conectar', () => {
    render(<AvisoConexion />)
    expect(screen.queryByRole('status')).toBeNull()

    avisar()

    expect(screen.getByRole('status').textContent).toContain('Sin conexión con el servidor')
  })

  it('desaparece solo a los 6 segundos, y otro fallo reinicia la cuenta atrás', () => {
    vi.useFakeTimers()
    render(<AvisoConexion />)

    avisar()
    act(() => vi.advanceTimersByTime(4000))
    avisar()
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByRole('status')).toBeTruthy()

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('se puede cerrar a mano', () => {
    render(<AvisoConexion />)
    avisar()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('al desmontarse deja de escuchar los avisos', () => {
    const { unmount } = render(<AvisoConexion />)
    unmount()

    expect(() => avisar()).not.toThrow()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
