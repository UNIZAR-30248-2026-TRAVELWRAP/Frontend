import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CrearViaje from '../src/screens/CrearViaje'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

const botonCrear = () => screen.getByRole('button', { name: /^Crear viaje|^Creando viaje/ })

const rellenar = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Nombre del viaje'), '  Roma 2027  ')
  await user.type(screen.getByLabelText('Presupuesto estimado (€)'), '850')
  await user.type(screen.getByPlaceholderText('Ciudad o país'), ' Roma ')
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CrearViaje', () => {
  it('permite crear el viaje sin destino para decidirlo por votación', async () => {
    const user = userEvent.setup()
    const creado = { id: 'v1', nombre: 'Verano 2027', destino: null, pendiente_destino: true }
    const fetchMock = vi.fn(() => respuesta(201, creado))
    vi.stubGlobal('fetch', fetchMock)
    const onCreated = vi.fn()
    render(<CrearViaje tokenSesion="token-acceso" onCreated={onCreated} />)

    await user.type(screen.getByLabelText('Nombre del viaje'), 'Verano 2027')
    await user.type(screen.getByLabelText('Presupuesto estimado (€)'), '900')
    await user.click(screen.getByRole('radio', { name: /Votar destino/ }))
    expect(screen.queryByPlaceholderText('Ciudad o país')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Crear viaje y elegir destino' }))

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(creado))
    const [, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(opciones.body as string)).toMatchObject({ nombre: 'Verano 2027', presupuesto: 900, destino: null })
  })

  it('no deja crear hasta tener nombre, presupuesto y destino', async () => {
    const user = userEvent.setup()
    render(<CrearViaje tokenSesion="token-acceso" />)

    expect(botonCrear()).toHaveProperty('disabled', true)
    await user.type(screen.getByLabelText('Nombre del viaje'), 'Roma 2027')
    await user.type(screen.getByLabelText('Presupuesto estimado (€)'), '850')
    expect(botonCrear()).toHaveProperty('disabled', true)
    await user.type(screen.getByPlaceholderText('Ciudad o país'), 'Roma')
    expect(botonCrear()).toHaveProperty('disabled', false)
  })

  it('crea el viaje en el backend y avisa con el viaje creado', async () => {
    const user = userEvent.setup()
    const creado = { id: 'v1', nombre: 'Roma 2027', destino: 'Roma', pendiente_destino: false }
    const fetchMock = vi.fn(() => respuesta(201, creado))
    vi.stubGlobal('fetch', fetchMock)
    const onCreated = vi.fn()
    render(<CrearViaje tokenSesion="token-acceso" onCreated={onCreated} />)

    await rellenar(user)
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2027-05-12' } })
    await user.click(botonCrear())

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(creado))
    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toMatch(/\/viajes$/)
    expect(opciones.method).toBe('POST')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(JSON.parse(opciones.body as string)).toEqual({
      nombre: 'Roma 2027',
      presupuesto: 850,
      destino: 'Roma',
      fecha_inicio: '2027-05-12',
      fecha_fin: null,
    })
  })

  it('desactiva el botón mientras se crea el viaje', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<CrearViaje tokenSesion="token-acceso" />)

    await rellenar(user)
    await user.click(botonCrear())

    expect(botonCrear().textContent).toBe('Creando viaje...')
    expect(botonCrear()).toHaveProperty('disabled', true)
  })

  it('muestra el error del backend y deja volver a intentarlo', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(502, { error: { codigo: 'error_viaje', mensaje: 'No se ha podido crear el viaje' } }),
    ))
    const onCreated = vi.fn()
    render(<CrearViaje tokenSesion="token-acceso" onCreated={onCreated} />)

    await rellenar(user)
    await user.click(botonCrear())

    expect((await screen.findByRole('alert')).textContent).toBe('No se ha podido crear el viaje')
    expect(botonCrear()).toHaveProperty('disabled', false)
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('avisa si la fecha de fin es anterior a la de inicio', () => {
    render(<CrearViaje tokenSesion="token-acceso" />)

    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2027-07-08' } })
    fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2027-07-01' } })

    expect(screen.getByRole('alert').textContent).toBe('La fecha de fin no puede ser anterior a la de inicio')
  })
})
