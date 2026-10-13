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

  it('el diálogo ofrece «Cancelar» y «Cerrar sesión»', async () => {
    const user = userEvent.setup()
    render(<Perfil {...datos} />)

    await user.click(botonCerrarSesion())

    const ventana = dialogo()!
    expect(within(ventana).getByRole('button', { name: 'Cancelar' })).toBeTruthy()
    expect(within(ventana).getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy()
  })

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

  it('se puede cancelar y volver a abrir el diálogo', async () => {
    const user = userEvent.setup()
    render(<Perfil {...datos} />)

    await user.click(botonCerrarSesion())
    await user.click(within(dialogo()!).getByRole('button', { name: 'Cancelar' }))
    await user.click(botonCerrarSesion())

    expect(dialogo()).toBeTruthy()
  })

  it('el diálogo es modal y está etiquetado con su título', async () => {
    const user = userEvent.setup()
    render(<Perfil {...datos} />)

    await user.click(botonCerrarSesion())

    const ventana = dialogo()!
    expect(ventana.getAttribute('aria-modal')).toBe('true')
    const idTitulo = ventana.getAttribute('aria-labelledby')!
    expect(document.getElementById(idTitulo)!.textContent).toBe('¿Cerrar sesión?')
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
