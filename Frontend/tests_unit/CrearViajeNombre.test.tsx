import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CrearViaje from '../src/screens/CrearViaje'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  )

const nombre = () => screen.getByLabelText('Nombre del viaje') as HTMLInputElement
const destino = () => screen.getByPlaceholderText('Ciudad o país')
const botonCrear = () => screen.getByRole('button', { name: /^Crear viaje/ })

const ponerFechas = (inicio: string, fin: string) => {
  fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: inicio } })
  fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: fin } })
}

const crearYLeerCuerpo = async (user: ReturnType<typeof userEvent.setup>, fetchMock: ReturnType<typeof vi.fn>) => {
  await user.click(botonCrear())
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
  const [, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
  return JSON.parse(opciones.body as string)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CrearViaje · nombre por defecto', () => {
  it('deja el campo Nombre vacío aunque se escriban el destino y las fechas', async () => {
    const user = userEvent.setup()
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.type(destino(), 'Roma')
    ponerFechas('2027-05-12', '2027-05-15')

    expect(nombre().value).toBe('')
  })

  it('muestra como ejemplo el nombre que tendrá: el destino y el año de las fechas', async () => {
    const user = userEvent.setup()
    render(<CrearViaje tokenSesion="token-acceso" />)

    expect(nombre().placeholder).toBe('Ej. Verano 2027')
    await user.type(destino(), ' Praga ')
    ponerFechas('2027-12-28', '2028-01-03')
    expect(nombre().placeholder).toBe('Praga 2027-2028')
  })

  it('con «Votar destino» muestra el nombre temporal que tendrá hasta que se elija el destino', async () => {
    const user = userEvent.setup()
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.click(screen.getByRole('radio', { name: /Votar destino/ }))
    ponerFechas('2027-05-12', '2027-05-15')

    expect(nombre().placeholder).toBe('Viaje sin destino 2027')
  })

  it('al crear sin nombre lo envía vacío (null) para que el backend ponga el del destino y el año', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(() => respuesta(201, { id: 'v1', nombre: 'Roma 2027', destino: 'Roma', pendiente_destino: false }))
    vi.stubGlobal('fetch', fetchMock)
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.type(destino(), ' Roma ')
    ponerFechas('2027-05-12', '2027-05-15')
    await user.type(screen.getByLabelText('Presupuesto estimado (€)'), '850')

    expect(await crearYLeerCuerpo(user, fetchMock)).toMatchObject({ nombre: null, destino: 'Roma' })
  })

  it('si el usuario escribe un nombre, es el que se guarda', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(() => respuesta(201, { id: 'v1', pendiente_destino: false }))
    vi.stubGlobal('fetch', fetchMock)
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.type(nombre(), '  Escapada con los primos  ')
    await user.type(destino(), 'Roma')
    ponerFechas('2027-05-12', '2027-05-15')
    await user.type(screen.getByLabelText('Presupuesto estimado (€)'), '850')

    expect((await crearYLeerCuerpo(user, fetchMock)).nombre).toBe('Escapada con los primos')
  })

  it('un nombre solo con espacios cuenta como vacío', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(() => respuesta(201, { id: 'v1', pendiente_destino: false }))
    vi.stubGlobal('fetch', fetchMock)
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.type(nombre(), '   ')
    await user.type(destino(), 'Roma')
    ponerFechas('2027-05-12', '2027-05-15')
    await user.type(screen.getByLabelText('Presupuesto estimado (€)'), '850')

    expect((await crearYLeerCuerpo(user, fetchMock)).nombre).toBeNull()
  })

  it('con «Votar destino» se puede crear sin nombre: lleva uno temporal hasta elegir el destino', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(() => respuesta(201, { id: 'v1', pendiente_destino: true }))
    vi.stubGlobal('fetch', fetchMock)
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.click(screen.getByRole('radio', { name: /Votar destino/ }))
    await user.type(screen.getByLabelText('Presupuesto estimado (€)'), '850')

    expect(botonCrear()).toHaveProperty('disabled', false)
    expect(await crearYLeerCuerpo(user, fetchMock)).toMatchObject({ nombre: null, destino: null })
  })

  it('con «Destino ya elegido» y sin escribir el destino no deja crear', async () => {
    const user = userEvent.setup()
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.type(screen.getByLabelText('Presupuesto estimado (€)'), '850')

    expect(botonCrear()).toHaveProperty('disabled', true)
  })
})
