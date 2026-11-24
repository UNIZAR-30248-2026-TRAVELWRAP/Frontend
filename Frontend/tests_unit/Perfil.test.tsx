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

  it('muestra la sección «Cuenta y seguridad» con el botón de cerrar sesión', () => {
    render(<Perfil {...datos} />)

    expect(screen.getByText('Cuenta y seguridad')).toBeTruthy()
    expect(botonCerrarSesion()).toBeTruthy()
  })

  it('no muestra el diálogo de confirmación al principio', () => {
    render(<Perfil {...datos} />)
    expect(dialogo()).toBeNull()
  })

  it('llama a onVolver al pulsar el botón de volver', async () => {
    const user = userEvent.setup()
    const onVolver = vi.fn()
    render(<Perfil {...datos} onVolver={onVolver} />)

    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})

describe('Perfil · cerrar sesión con confirmación', () => {
  it('al pulsar «Cerrar sesión» pide confirmación sin cerrar todavía', async () => {
    const user = userEvent.setup()
    const onCerrarSesion = vi.fn()
    render(<Perfil {...datos} onCerrarSesion={onCerrarSesion} />)

    await user.click(botonCerrarSesion())

    const ventana = dialogo()!
    expect(ventana).toBeTruthy()
    expect(within(ventana).getByText('¿Cerrar sesión?')).toBeTruthy()
    expect(
      within(ventana).getByText('Tendrás que volver a introducir tus datos para acceder a TravelWrap.'),
    ).toBeTruthy()
    expect(onCerrarSesion).not.toHaveBeenCalled()
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
