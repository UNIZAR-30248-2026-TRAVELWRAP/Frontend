import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Registro from '../src/screens/Registro'

afterEach(() => {
  cleanup()
})

const campo = (nombre: string) => screen.getByLabelText(nombre, { exact: true })
const boton = () => screen.getByRole('button', { name: /crear cuenta|creando cuenta/i })

const rellenar = async (
  user: ReturnType<typeof userEvent.setup>,
  datos: { nombre?: string; email?: string; password?: string; confirmacion?: string },
) => {
  if (datos.nombre !== undefined) await user.type(campo('Nombre'), datos.nombre)
  if (datos.email !== undefined) await user.type(campo('Email'), datos.email)
  if (datos.password !== undefined) await user.type(campo('Contraseña'), datos.password)
  if (datos.confirmacion !== undefined) await user.type(campo('Repite la contraseña'), datos.confirmacion)
}

const validos = {
  nombre: 'Daniel Blasco',
  email: 'daniel@travelwrap.app',
  password: 'secreta123',
  confirmacion: 'secreta123',
}

describe('Registro', () => {
  it('muestra los cuatro campos del formulario', () => {
    render(<Registro />)
    expect(campo('Nombre')).toBeTruthy()
    expect(campo('Email')).toBeTruthy()
    expect(campo('Contraseña')).toBeTruthy()
    expect(campo('Repite la contraseña')).toBeTruthy()
  })

  it('tiene el botón desactivado con el formulario vacío', () => {
    render(<Registro />)
    expect(boton()).toHaveProperty('disabled', true)
  })

  it('activa el botón cuando todos los datos son válidos', async () => {
    const user = userEvent.setup()
    render(<Registro />)

    await rellenar(user, validos)

    expect(boton()).toHaveProperty('disabled', false)
  })

  it('avisa si el email no es válido y mantiene el botón desactivado', async () => {
    const user = userEvent.setup()
    render(<Registro />)

    await rellenar(user, { ...validos, email: 'daniel@' })

    expect(screen.getByText('Introduce un email válido')).toBeTruthy()
    expect(boton()).toHaveProperty('disabled', true)
  })

  it('avisa si la contraseña tiene menos de 8 caracteres', async () => {
    const user = userEvent.setup()
    render(<Registro />)

    await rellenar(user, { ...validos, password: '1234567', confirmacion: '1234567' })

    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeTruthy()
    expect(boton()).toHaveProperty('disabled', true)
  })

  it('acepta una contraseña de exactamente 8 caracteres', async () => {
    const user = userEvent.setup()
    render(<Registro />)

    await rellenar(user, { ...validos, password: '12345678', confirmacion: '12345678' })

    expect(screen.queryByText('La contraseña debe tener al menos 8 caracteres')).toBeNull()
    expect(boton()).toHaveProperty('disabled', false)
  })

  it('avisa si las contraseñas no coinciden', async () => {
    const user = userEvent.setup()
    render(<Registro />)

    await rellenar(user, { ...validos, confirmacion: 'otra-distinta' })

    expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy()
    expect(boton()).toHaveProperty('disabled', true)
  })

  it('mantiene el botón desactivado si el nombre es solo espacios', async () => {
    const user = userEvent.setup()
    render(<Registro />)

    await rellenar(user, { ...validos, nombre: '   ' })

    expect(boton()).toHaveProperty('disabled', true)
  })

  it('no muestra avisos mientras no se ha escrito nada', () => {
    render(<Registro />)
    expect(screen.queryByText('Introduce un email válido')).toBeNull()
    expect(screen.queryByText('Las contraseñas no coinciden')).toBeNull()
  })

  it('llama a onRegistro con el nombre y el email sin espacios sobrantes y la contraseña', async () => {
    const user = userEvent.setup()
    const onRegistro = vi.fn()
    render(<Registro onRegistro={onRegistro} />)

    await rellenar(user, { ...validos, nombre: '  Daniel Blasco  ', email: '  daniel@travelwrap.app  ' })
    await user.click(boton())

    expect(onRegistro).toHaveBeenCalledWith('Daniel Blasco', 'daniel@travelwrap.app', 'secreta123')
  })

  it('no llama a onRegistro si los datos no son válidos', async () => {
    const user = userEvent.setup()
    const onRegistro = vi.fn()
    render(<Registro onRegistro={onRegistro} />)

    await rellenar(user, { ...validos, confirmacion: 'otra-distinta' })
    await user.click(boton())

    expect(onRegistro).not.toHaveBeenCalled()
  })

  it('muestra el mensaje de error recibido', () => {
    render(<Registro error="Ya existe una cuenta con ese email" />)
    expect(screen.getByRole('alert').textContent).toBe('Ya existe una cuenta con ese email')
  })

  it('muestra el aviso de confirmación de correo', () => {
    render(<Registro aviso="Cuenta creada. Revisa tu correo y confirma tu email para iniciar sesión" />)
    expect(screen.getByRole('status').textContent).toBe(
      'Cuenta creada. Revisa tu correo y confirma tu email para iniciar sesión',
    )
  })

  it('no muestra error ni aviso si no los hay', () => {
    render(<Registro />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('muestra "Creando cuenta..." y desactiva el botón mientras carga', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Registro />)
    await rellenar(user, validos)

    rerender(<Registro loading />)

    expect(boton().textContent).toBe('Creando cuenta...')
    expect(boton()).toHaveProperty('disabled', true)
  })

  it('muestra el enlace a iniciar sesión solo si se puede navegar', async () => {
    const user = userEvent.setup()
    const onIrALogin = vi.fn()
    const { rerender } = render(<Registro />)
    expect(screen.queryByRole('button', { name: 'Inicia sesión' })).toBeNull()

    rerender(<Registro onIrALogin={onIrALogin} />)
    await user.click(screen.getByRole('button', { name: 'Inicia sesión' }))

    expect(onIrALogin).toHaveBeenCalledTimes(1)
  })
})
