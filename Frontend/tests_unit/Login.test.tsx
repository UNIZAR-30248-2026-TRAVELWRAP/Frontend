import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../src/screens/Login'

afterEach(() => {
  cleanup()
})

const boton = () => screen.getByRole('button', { name: /iniciar sesión|entrando/i })

describe('Login', () => {
  it('muestra los campos de email y contraseña', () => {
    render(<Login />)
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByLabelText('Contraseña')).toBeTruthy()
  })

  it('desactiva el botón hasta rellenar email y contraseña', async () => {
    const user = userEvent.setup()
    render(<Login />)

    expect(boton()).toHaveProperty('disabled', true)
    await user.type(screen.getByLabelText('Email'), 'daniel@travelwrap.app')
    expect(boton()).toHaveProperty('disabled', true)
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123')
    expect(boton()).toHaveProperty('disabled', false)
  })

  it('llama a onLogin con el email sin espacios y la contraseña', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} />)

    await user.type(screen.getByLabelText('Email'), '  daniel@travelwrap.app  ')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123')
    await user.click(boton())

    expect(onLogin).toHaveBeenCalledWith('daniel@travelwrap.app', 'secreta123')
  })

  it('no llama a onLogin si faltan datos', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} />)

    await user.type(screen.getByLabelText('Email'), 'daniel@travelwrap.app')
    await user.click(boton())

    expect(onLogin).not.toHaveBeenCalled()
  })

  it('muestra el mensaje de error recibido', () => {
    render(<Login error="Email o contraseña incorrectos" />)
    expect(screen.getByRole('alert').textContent).toBe('Email o contraseña incorrectos')
  })

  it('no muestra ningún error si no lo hay', () => {
    render(<Login />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('muestra "Entrando..." y desactiva el botón mientras carga', () => {
    render(<Login loading />)
    expect(boton().textContent).toBe('Entrando...')
    expect(boton()).toHaveProperty('disabled', true)
  })
})
