import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Perfil from '../src/screens/Perfil'
import { ApiError } from '../src/services/authApi'
import { eliminarCuenta } from '../src/services/perfilApi'

vi.mock('../src/services/perfilApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/perfilApi')>()),
  eliminarCuenta: vi.fn(),
}))
vi.mock('../src/services/sellosApi', () => ({ listarMisSellos: vi.fn(() => Promise.resolve({ sellos: [] })) }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const datos = { nombre: 'Adriana', email: 'adriana@travelwrap.app', token: 'token-acceso' }

const botonEliminar = () => screen.getByRole('button', { name: /^Eliminar cuenta/ })
const dialogo = () => screen.queryByRole('dialog')

describe('Perfil · eliminar cuenta', () => {
  it('muestra la opción «Eliminar cuenta» con el aviso de que es permanente', () => {
    render(<Perfil {...datos} />)

    expect(botonEliminar()).toBeTruthy()
    expect(screen.getByText('Esta acción es permanente')).toBeTruthy()
    expect(dialogo()).toBeNull()
  })


  it('al cancelar cierra el diálogo y no elimina nada', async () => {
    const user = userEvent.setup()
    const onCuentaEliminada = vi.fn()
    render(<Perfil {...datos} onCuentaEliminada={onCuentaEliminada} />)

    await user.click(botonEliminar())
    await user.click(within(dialogo()!).getByRole('button', { name: 'Cancelar' }))

    expect(dialogo()).toBeNull()
    expect(eliminarCuenta).not.toHaveBeenCalled()
    expect(onCuentaEliminada).not.toHaveBeenCalled()
  })



  it('si falla muestra el error, no cierra la sesión y permite volver a intentarlo', async () => {
    const user = userEvent.setup()
    vi.mocked(eliminarCuenta).mockRejectedValueOnce(
      new ApiError(502, 'error_cuenta', 'No se ha podido eliminar la cuenta'),
    )
    const onCuentaEliminada = vi.fn()
    render(<Perfil {...datos} onCuentaEliminada={onCuentaEliminada} />)

    await user.click(botonEliminar())
    await user.click(within(dialogo()!).getByRole('button', { name: 'Eliminar cuenta' }))

    expect((await within(dialogo()!).findByRole('alert')).textContent).toBe('No se ha podido eliminar la cuenta')
    expect(onCuentaEliminada).not.toHaveBeenCalled()

    vi.mocked(eliminarCuenta).mockResolvedValueOnce(undefined)
    await user.click(within(dialogo()!).getByRole('button', { name: 'Eliminar cuenta' }))
    await waitFor(() => expect(onCuentaEliminada).toHaveBeenCalledTimes(1))
  })

  it('si no hay conexión lo dice', async () => {
    const user = userEvent.setup()
    vi.mocked(eliminarCuenta).mockRejectedValue(new ApiError(0, 'sin_conexion', 'No se puede conectar con el servidor'))
    render(<Perfil {...datos} />)

    await user.click(botonEliminar())
    await user.click(within(dialogo()!).getByRole('button', { name: 'Eliminar cuenta' }))

    expect((await within(dialogo()!).findByRole('alert')).textContent).toContain('No hay conexión con el servidor')
  })

})
