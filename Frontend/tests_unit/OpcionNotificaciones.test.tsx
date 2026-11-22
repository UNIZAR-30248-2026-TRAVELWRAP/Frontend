import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OpcionNotificaciones from '../src/components/OpcionNotificaciones'
import * as push from '../src/services/pushNotificaciones'

vi.mock('../src/services/pushNotificaciones')

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const interruptor = () => screen.findByRole('switch', { name: 'Notificaciones push' })

describe('OpcionNotificaciones', () => {
  it('las activa pidiendo permiso y las desactiva después', async () => {
    vi.mocked(push.estadoPush).mockResolvedValue('desactivadas')
    vi.mocked(push.activarPush).mockResolvedValue('activadas')
    vi.mocked(push.desactivarPush).mockResolvedValue('desactivadas')
    render(<OpcionNotificaciones token="token" />)

    const opcion = await interruptor()
    expect(opcion.getAttribute('aria-checked')).toBe('false')

    await userEvent.click(opcion)
    await waitFor(() => expect(opcion.getAttribute('aria-checked')).toBe('true'))
    expect(push.activarPush).toHaveBeenCalledWith('token')

    await userEvent.click(opcion)
    await waitFor(() => expect(opcion.getAttribute('aria-checked')).toBe('false'))
    expect(push.desactivarPush).toHaveBeenCalledWith('token')
  })

  it('no se puede activar si el navegador las tiene bloqueadas', async () => {
    vi.mocked(push.estadoPush).mockResolvedValue('bloqueadas')
    render(<OpcionNotificaciones token="token" />)

    expect((await interruptor()).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/bloqueadas en el navegador/)).toBeTruthy()
  })

  it('muestra el error si no se pueden cambiar', async () => {
    vi.mocked(push.estadoPush).mockResolvedValue('desactivadas')
    vi.mocked(push.activarPush).mockRejectedValue(new Error('fallo'))
    render(<OpcionNotificaciones token="token" />)

    await userEvent.click(await interruptor())

    expect((await screen.findByRole('alert')).textContent).toMatch(/No se han podido cambiar/)
    expect((await interruptor()).getAttribute('aria-checked')).toBe('false')
  })
})
