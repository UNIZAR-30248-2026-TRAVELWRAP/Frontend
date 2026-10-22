import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ElegirDestino from '../src/screens/ElegirDestino'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

const viaje = (datos: Record<string, unknown> = {}) => ({
  id: VIAJE_ID,
  nombre: 'Verano 2027',
  destino: null,
  estado: 'activo',
  pendiente_destino: true,
  rol: 'creador',
  miembros: [
    { usuario_id: 'u1', nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
  ...datos,
})

// GET devuelve el viaje pendiente; PATCH lo devuelve con el destino enviado
const simularBackend = (datos: Record<string, unknown> = {}) => {
  const fetchMock = vi.fn((_url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'PATCH') {
      const { destino } = JSON.parse(opciones.body as string)
      return respuesta(200, viaje({ ...datos, destino, pendiente_destino: false }))
    }
    return respuesta(200, viaje(datos))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const proponer = async (user: ReturnType<typeof userEvent.setup>, destino: string) => {
  await user.type(screen.getByLabelText('Proponer destino'), destino)
  await user.click(screen.getByRole('button', { name: 'Añadir' }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ElegirDestino', () => {
  it('muestra el viaje pendiente con sus miembros y sin destinos propuestos todavía', async () => {
    simularBackend()
    render(<ElegirDestino viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    expect(await screen.findByText('Elegir Destino')).toBeTruthy()
    expect(screen.getByText('Verano 2027')).toBeTruthy()
    expect(screen.getByText(/Todavía no hay destinos propuestos/)).toBeTruthy()
    expect(screen.getByText('0/2')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Fijar destino/ })).toHaveProperty('disabled', true)
  })

  it('permite proponer destinos sin repetirlos y votar uno', async () => {
    const user = userEvent.setup()
    simularBackend()
    render(<ElegirDestino viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('Elegir Destino')

    await proponer(user, 'Lisboa')
    await proponer(user, 'Praga')
    await proponer(user, ' lisboa ')
    expect(screen.getByRole('alert').textContent).toBe('Ese destino ya está propuesto')

    await user.click(screen.getByRole('radio', { name: /Praga/ }))
    expect(screen.getByRole('radio', { name: /Praga/ }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('1/2')).toBeTruthy()
  })

  it('el creador fija el destino votado tras confirmarlo y se guarda en el viaje', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    const onDestinoFijado = vi.fn()
    render(<ElegirDestino viajeId={VIAJE_ID} tokenSesion="token-acceso" onDestinoFijado={onDestinoFijado} />)
    await screen.findByText('Elegir Destino')

    await proponer(user, 'Lisboa')
    await user.click(screen.getByRole('radio', { name: /Lisboa/ }))
    await user.click(screen.getByRole('button', { name: 'Fijar «Lisboa» como destino' }))
    expect(screen.getByRole('dialog', { name: 'Confirmar destino' }).textContent).toContain('Se fijará Lisboa')
    await user.click(screen.getByRole('button', { name: 'Confirmar Lisboa' }))

    await vi.waitFor(() => expect(onDestinoFijado).toHaveBeenCalled())
    const patch = fetchMock.mock.calls.find(([, o]) => o?.method === 'PATCH') as unknown as [string, RequestInit]
    expect(patch[0]).toMatch(new RegExp(`/viajes/${VIAJE_ID}$`))
    expect(JSON.parse(patch[1].body as string)).toEqual({ destino: 'Lisboa' })
  })

  it('quien no es el creador no puede fijar el destino', async () => {
    simularBackend({ rol: 'miembro' })
    render(<ElegirDestino viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    expect(await screen.findByText(/El creador del viaje fijará el destino/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Fijar/ })).toBeNull()
  })

  it('si el viaje ya tiene destino pasa directamente al inicio del viaje', async () => {
    simularBackend({ destino: 'Roma', pendiente_destino: false })
    const onDestinoFijado = vi.fn()
    render(<ElegirDestino viajeId={VIAJE_ID} tokenSesion="token-acceso" onDestinoFijado={onDestinoFijado} />)

    await vi.waitFor(() => expect(onDestinoFijado).toHaveBeenCalled())
    expect(screen.queryByText('Elegir Destino')).toBeNull()
  })
})
