import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Perfil from '../src/screens/Perfil'

afterEach(() => {
  cleanup()
})

const datos = { nombre: 'Daniel Blasco', email: 'daniel@travelwrap.app' }

const botonCerrarSesion = () => screen.getByRole('button', { name: /^(Cerrar sesión|Cerrando sesión\.\.\.)$/ })
const dialogo = () => screen.queryByRole('dialog')

describe('Perfil', () => {
  it('muestra el nombre, el email y la inicial del usuario', () => {
    render(<Perfil {...datos} />)

    expect(screen.getByText('Mi Perfil')).toBeTruthy()
    expect(screen.getByText('Daniel Blasco')).toBeTruthy()
    expect(screen.getByText('daniel@travelwrap.app')).toBeTruthy()
    expect(screen.getByText('D')).toBeTruthy()
  })



})

describe('Perfil · cerrar sesión con confirmación', () => {


  it('al cancelar se cierra el diálogo y no se cierra la sesión', async () => {
    const user = userEvent.setup()
    const onCerrarSesion = vi.fn()
    render(<Perfil {...datos} onCerrarSesion={onCerrarSesion} />)

    await user.click(botonCerrarSesion())
    await user.click(within(dialogo()!).getByRole('button', { name: 'Cancelar' }))

    expect(dialogo()).toBeNull()
    expect(onCerrarSesion).not.toHaveBeenCalled()
  })

  it('al confirmar llama a onCerrarSesion una sola vez y cierra el diálogo', async () => {
    const user = userEvent.setup()
    const onCerrarSesion = vi.fn()
    render(<Perfil {...datos} onCerrarSesion={onCerrarSesion} />)

    await user.click(botonCerrarSesion())
    await user.click(within(dialogo()!).getByRole('button', { name: 'Cerrar sesión' }))

    expect(onCerrarSesion).toHaveBeenCalledTimes(1)
    expect(dialogo()).toBeNull()
  })



  it('mientras se cierra la sesión muestra «Cerrando sesión...» y desactiva el botón', () => {
    render(<Perfil {...datos} cerrandoSesion />)

    expect(botonCerrarSesion().textContent).toContain('Cerrando sesión...')
    expect(botonCerrarSesion()).toHaveProperty('disabled', true)
  })

  it('muestra el error recibido', () => {
    render(<Perfil {...datos} error="No se ha podido cerrar la sesión" />)
    expect(screen.getByRole('alert').textContent).toBe('No se ha podido cerrar la sesión')
  })

  it('no muestra ningún error si no lo hay', () => {
    render(<Perfil {...datos} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
