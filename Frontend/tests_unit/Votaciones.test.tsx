import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Votaciones from '../src/screens/Votaciones'
import { VIAJE_ID, llamadas, opcion, simularBackendVotaciones, viajeDePrueba, type VotacionGuardada } from './backendVotaciones'

const PREGUNTA_ABIERTA = '¿Qué fin de semana preferimos?'

const fechas = (): VotacionGuardada => ({
  id: 'fechas',
  titulo: PREGUNTA_ABIERTA,
  tipo: 'fecha',
  estado: 'abierta',
  opciones: [opcion('mayo-12', '12 – 15 mayo', 0), opcion('mayo-19', '19 – 22 mayo', 1)],
  votos: { u2: 'mayo-12', u3: 'mayo-12' },
})

const alojamiento = (): VotacionGuardada => ({
  id: 'alojamiento',
  titulo: '¿Qué tipo de alojamiento preferís?',
  tipo: 'otro',
  estado: 'cerrada',
  opcion_ganadora_id: 'airbnb',
  opciones: [opcion('airbnb', 'Airbnb compartido', 0), opcion('hotel', 'Hotel', 1)],
  votos: { u1: 'airbnb', u2: 'airbnb', u3: 'hotel' },
})

const viajeConDestino = viajeDePrueba({ destino: 'Roma', pendiente_destino: false })

const abrir = async (opciones: Parameters<typeof simularBackendVotaciones>[0] = {}) => {
  const backend = simularBackendVotaciones({ viaje: viajeConDestino, votaciones: [fechas(), alojamiento()], ...opciones })
  render(<Votaciones viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
  await screen.findByRole('region', { name: PREGUNTA_ABIERTA })
  return backend
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Votaciones', () => {
  it('muestra las votaciones del viaje: la abierta con su recuento y la cerrada con su ganadora', async () => {
    await abrir()

    const abierta = screen.getByRole('region', { name: PREGUNTA_ABIERTA })
    expect(within(abierta).getAllByRole('radio')).toHaveLength(2)
    expect(within(abierta).getByText('2/3')).toBeTruthy()
    expect(within(abierta).getByRole('button', { name: 'Emitir voto' })).toHaveProperty('disabled', true)

    const cerrada = screen.getByRole('region', { name: '¿Qué tipo de alojamiento preferís?' })
    expect(cerrada.textContent).toContain('Ganó: Airbnb compartido (67%)')
  })

  it('filtra por tipo de votación', async () => {
    const user = userEvent.setup()
    await abrir()

    await user.click(screen.getByRole('tab', { name: 'Fechas' }))
    expect(screen.getByRole('region', { name: PREGUNTA_ABIERTA })).toBeTruthy()
    expect(screen.queryByText('¿Qué tipo de alojamiento preferís?')).toBeNull()

    await user.click(screen.getByRole('tab', { name: 'Actividades' }))
    expect(screen.getByText('No hay votaciones de este tipo todavía.')).toBeTruthy()
  })

  it('al emitir el voto se envía al backend y se muestra el recuento que devuelve', async () => {
    const user = userEvent.setup()
    const { fetchMock } = await abrir()
    const abierta = screen.getByRole('region', { name: PREGUNTA_ABIERTA })

    await user.click(within(abierta).getByRole('radio', { name: /19 – 22 mayo/ }))
    await user.click(within(abierta).getByRole('button', { name: 'Emitir voto' }))

    expect(await within(abierta).findByRole('button', { name: /Voto emitido/ })).toBeTruthy()
    expect(within(abierta).getByText('3/3')).toBeTruthy()
    expect(within(abierta).getByRole('radio', { name: /19 – 22 mayo/ }).textContent).toContain('Tu elección')
    const [[, peticion]] = llamadas(fetchMock, 'PUT', '/votaciones/fechas/voto')
    expect(JSON.parse(peticion?.body as string)).toEqual({ opcion_id: 'mayo-19' })
  })

  it('el creador cierra la votación tras confirmar y pasa a cerradas con la ganadora', async () => {
    const user = userEvent.setup()
    const { fetchMock } = await abrir()

    await user.click(screen.getByRole('button', { name: 'Cerrar votación' }))
    const dialogo = screen.getByRole('dialog')
    expect(dialogo.textContent).toContain('Ganará 12 – 15 mayo')
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar votación' }))

    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const cerrada = screen.getByRole('region', { name: PREGUNTA_ABIERTA })
    expect(cerrada.textContent).toContain('Cerrada')
    expect(cerrada.textContent).toContain('Ganó: 12 – 15 mayo')
    expect(llamadas(fetchMock, 'POST', '/votaciones/fechas/cerrar')).toHaveLength(1)
  })

  it('avisa del empate antes de cerrar', async () => {
    const user = userEvent.setup()
    await abrir({ viaje: viajeConDestino, votaciones: [{ ...fechas(), votos: { u2: 'mayo-12', u3: 'mayo-19' } }] })

    await user.click(screen.getByRole('button', { name: 'Cerrar votación' }))

    expect(screen.getByRole('dialog').textContent).toContain('Hay un empate entre 12 – 15 mayo y 19 – 22 mayo')
  })

  it('quien no es el creador vota pero no puede cerrar la votación', async () => {
    await abrir({ viaje: { ...viajeConDestino, rol: 'miembro' }, votaciones: [fechas()] })

    expect(screen.getByRole('button', { name: 'Emitir voto' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cerrar votación' })).toBeNull()
  })

  it('el botón de crear y el de volver avisan a la ruta', async () => {
    const user = userEvent.setup()
    simularBackendVotaciones({ viaje: viajeConDestino })
    const onVolver = vi.fn()
    const onCrearVotacion = vi.fn()
    render(<Votaciones viajeId={VIAJE_ID} tokenSesion="token-acceso" onVolver={onVolver} onCrearVotacion={onCrearVotacion} />)

    expect(await screen.findByText('Todavía no hay votaciones en este viaje.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Crear nueva votación' }))
    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(onCrearVotacion).toHaveBeenCalledTimes(1)
    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})
