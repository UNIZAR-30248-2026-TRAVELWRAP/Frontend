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

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CrearViaje · nombre sugerido', () => {
  it('rellena el nombre con el destino y el año de las fechas', async () => {
    const user = userEvent.setup()
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.type(destino(), 'Roma')
    expect(nombre().value).toBe('Roma')
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2027-05-12' } })
    fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2027-05-15' } })

    expect(nombre().value).toBe('Roma 2027')
  })

  it('si el viaje cruza de año pone los dos años', async () => {
    const user = userEvent.setup()
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.type(destino(), 'Praga')
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2027-12-28' } })
    fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2028-01-03' } })

    expect(nombre().value).toBe('Praga 2027-2028')
  })

  it('deja de cambiar el nombre en cuanto el usuario lo escribe', async () => {
    const user = userEvent.setup()
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.type(destino(), 'Roma')
    await user.clear(nombre())
    await user.type(nombre(), 'Escapada con los primos')
    await user.type(destino(), ' Antigua')
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2027-05-12' } })

    expect(nombre().value).toBe('Escapada con los primos')
  })

  it('con «Votar destino» no sugiere ningún nombre', async () => {
    const user = userEvent.setup()
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.type(destino(), 'Roma')
    expect(nombre().value).toBe('Roma')
    await user.click(screen.getByRole('radio', { name: /Votar destino/ }))

    expect(nombre().value).toBe('')
  })

  it('envía el nombre sugerido al crear el viaje', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(() => respuesta(201, { id: 'v1', nombre: 'Roma 2027', destino: 'Roma', pendiente_destino: false }))
    vi.stubGlobal('fetch', fetchMock)
    const onCreated = vi.fn()
    render(<CrearViaje tokenSesion="token-acceso" onCreated={onCreated} />)

    await user.type(destino(), ' Roma ')
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2027-05-12' } })
    fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2027-05-15' } })
    await user.type(screen.getByLabelText('Presupuesto estimado (€)'), '850')
    await user.click(screen.getByRole('button', { name: 'Crear viaje' }))

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalled())
    const [, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(opciones.body as string)).toMatchObject({ nombre: 'Roma 2027', destino: 'Roma' })
  })

  it('no deja crear el viaje si no hay nombre ni destino que lo sugiera', async () => {
    const user = userEvent.setup()
    render(<CrearViaje tokenSesion="token-acceso" />)

    await user.type(screen.getByLabelText('Presupuesto estimado (€)'), '850')

    expect(screen.getByRole('button', { name: 'Crear viaje' })).toHaveProperty('disabled', true)
  })
})
