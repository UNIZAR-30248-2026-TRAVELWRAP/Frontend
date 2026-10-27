import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ElegirDestino from '../src/screens/ElegirDestino'
import {
  VIAJE_ID,
  avisarCambio,
  llamadas,
  opcion,
  simularBackendVotaciones,
  viajeDePrueba,
  type VotacionGuardada,
} from './backendVotaciones'

// Sin servidor de WebSocket: los avisos se lanzan desde el test con avisarCambio
vi.mock('../src/services/votacionesTiempoReal')

// Votación de destino que se abre al crear el viaje sin destino
const destino = (datos: Partial<VotacionGuardada> = {}): VotacionGuardada => ({
  id: 'destino',
  titulo: '¿A dónde queremos ir?',
  tipo: 'destino',
  estado: 'abierta',
  opciones: [],
  votos: {},
  ...datos,
})

const abrir = async (opciones: Parameters<typeof simularBackendVotaciones>[0] = {}, props = {}) => {
  const backend = simularBackendVotaciones({ votaciones: [destino()], ...opciones })
  render(<ElegirDestino viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)
  await screen.findByText('Elegir Destino')
  return backend
}

const proponer = async (user: ReturnType<typeof userEvent.setup>, texto: string) => {
  await user.type(screen.getByLabelText('Proponer destino'), texto)
  await user.click(screen.getByRole('button', { name: 'Añadir' }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('ElegirDestino', () => {
  it('muestra el viaje pendiente y su votación de destino, todavía sin propuestas', async () => {
    const { fetchMock } = await abrir()

    expect(screen.getByText('Verano 2027')).toBeTruthy()
    expect(await screen.findByText(/Todavía no hay destinos propuestos/)).toBeTruthy()
    expect(screen.getByText('0/3')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Fijar destino/ })).toHaveProperty('disabled', true)
    expect(llamadas(fetchMock, 'GET', '/votaciones')[0][0]).toContain('tipo=destino')
  })

  it('propone destinos en el backend sin repetirlos', async () => {
    const user = userEvent.setup()
    const { fetchMock } = await abrir()

    await proponer(user, 'Lisboa')
    expect(await screen.findByRole('radio', { name: /Lisboa/ })).toBeTruthy()
    await proponer(user, ' lisboa ')

    expect(screen.getByRole('alert').textContent).toBe('Ese destino ya está propuesto')
    const propuestas = llamadas(fetchMock, 'POST', '/votaciones/destino/opciones')
    expect(propuestas).toHaveLength(1)
    expect(JSON.parse(propuestas[0][1]?.body as string)).toEqual({ texto: 'Lisboa' })
  })

  it('al tocar un destino se vota, y se puede cambiar el voto', async () => {
    const user = userEvent.setup()
    const { fetchMock } = await abrir({
      votaciones: [destino({ opciones: [opcion('lisboa', 'Lisboa', 0), opcion('praga', 'Praga', 1)], votos: { u2: 'praga' } })],
    })

    await user.click(await screen.findByRole('radio', { name: /Lisboa/ }))
    await vi.waitFor(() => expect(screen.getByText('2/3')).toBeTruthy())
    await user.click(screen.getByRole('radio', { name: /Praga/ }))

    await vi.waitFor(() => expect(screen.getByRole('radio', { name: /Praga/ }).getAttribute('aria-checked')).toBe('true'))
    expect(screen.getByText('2/3')).toBeTruthy()
    expect(llamadas(fetchMock, 'PUT', '/votaciones/destino/voto')).toHaveLength(2)
  })

  it('el creador fija el destino cerrando la votación y pasa al inicio del viaje', async () => {
    const user = userEvent.setup()
    const onDestinoFijado = vi.fn()
    const { fetchMock } = await abrir(
      { votaciones: [destino({ opciones: [opcion('lisboa', 'Lisboa', 0), opcion('praga', 'Praga', 1)], votos: { u1: 'praga', u2: 'praga', u3: 'lisboa' } })] },
      { onDestinoFijado },
    )

    await user.click(await screen.findByRole('button', { name: 'Fijar «Praga» como destino' }))
    expect(screen.getByRole('dialog', { name: 'Confirmar destino' }).textContent).toContain('Se fijará Praga')
    await user.click(screen.getByRole('button', { name: 'Confirmar Praga' }))

    await vi.waitFor(() => expect(onDestinoFijado).toHaveBeenCalled())
    expect(onDestinoFijado.mock.calls[0][0]).toMatchObject({ destino: 'Praga', pendiente_destino: false })
    expect(llamadas(fetchMock, 'POST', '/votaciones/destino/cerrar')).toHaveLength(1)
    expect(llamadas(fetchMock, 'PATCH', `/viajes/${VIAJE_ID}`)).toHaveLength(0)
  })

  it('el destino solo se puede fijar cuando han votado todos los miembros (RF9)', async () => {
    await abrir({
      votaciones: [destino({ opciones: [opcion('lisboa', 'Lisboa', 0), opcion('praga', 'Praga', 1)], votos: { u1: 'praga', u2: 'praga' } })],
    })

    expect(await screen.findByRole('button', { name: 'Fijar «Praga» como destino' })).toHaveProperty('disabled', true)
    expect(screen.getByText('Podrás fijar el destino cuando hayan votado todos los miembros.')).toBeTruthy()
  })

  it('con empate avisa de que se sorteará antes de confirmar', async () => {
    const user = userEvent.setup()
    await abrir({
      votaciones: [
        destino({
          opciones: [opcion('lisboa', 'Lisboa', 0), opcion('praga', 'Praga', 1), opcion('roma', 'Roma', 2)],
          votos: { u1: 'lisboa', u2: 'praga', u3: 'roma' },
        }),
      ],
    })

    await user.click(await screen.findByRole('button', { name: 'Fijar destino (hay empate)' }))

    expect(screen.getByRole('dialog', { name: 'Confirmar destino' }).textContent).toContain('Hay un empate entre Lisboa, Praga y Roma')
    expect(screen.getByRole('button', { name: 'Confirmar sorteo' })).toBeTruthy()
  })

  it('quien no es el creador no puede fijar el destino', async () => {
    await abrir({ viaje: viajeDePrueba({ rol: 'miembro' }) })

    expect(screen.getByText(/El creador del viaje fijará el destino/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Fijar/ })).toBeNull()
  })

  it('si el viaje ya tiene destino pasa directamente al inicio del viaje', async () => {
    simularBackendVotaciones({ viaje: viajeDePrueba({ destino: 'Roma', pendiente_destino: false }) })
    const onDestinoFijado = vi.fn()
    render(<ElegirDestino viajeId={VIAJE_ID} tokenSesion="token-acceso" onDestinoFijado={onDestinoFijado} />)

    await vi.waitFor(() => expect(onDestinoFijado).toHaveBeenCalled())
    expect(screen.queryByText('Elegir Destino')).toBeNull()
  })
})

describe('ElegirDestino en tiempo real', () => {
  it('los destinos y votos de los demás aparecen sin recargar', async () => {
    const { estado } = await abrir()
    expect(await screen.findByText(/Todavía no hay destinos propuestos/)).toBeTruthy()

    estado.votaciones[0].opciones.push(opcion('oporto', 'Oporto'))
    estado.votaciones[0].votos.u2 = 'oporto'
    await avisarCambio({ votacion_id: 'destino', motivo: 'voto' })

    expect(await screen.findByRole('radio', { name: /Oporto/ })).toBeTruthy()
    expect(screen.getByText('1/3')).toBeTruthy()
  })

  it('cuando el creador fija el destino, los demás pasan solos al inicio del viaje', async () => {
    const onDestinoFijado = vi.fn()
    await abrir({ viaje: viajeDePrueba({ rol: 'miembro' }) }, { onDestinoFijado })

    await avisarCambio({ votacion_id: 'destino', motivo: 'cerrada', destino: 'Praga' })

    await vi.waitFor(() => expect(onDestinoFijado).toHaveBeenCalledTimes(1))
    expect(onDestinoFijado.mock.calls[0][0]).toMatchObject({ destino: 'Praga', pendiente_destino: false })
  })

  it('a quien lo ha fijado no se le redirige dos veces', async () => {
    const user = userEvent.setup()
    const onDestinoFijado = vi.fn()
    await abrir(
      { votaciones: [destino({ opciones: [opcion('praga', 'Praga')], votos: { u1: 'praga', u2: 'praga', u3: 'praga' } })] },
      { onDestinoFijado },
    )

    await user.click(await screen.findByRole('button', { name: 'Fijar «Praga» como destino' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar Praga' }))
    await vi.waitFor(() => expect(onDestinoFijado).toHaveBeenCalledTimes(1))
    await avisarCambio({ votacion_id: 'destino', motivo: 'cerrada', destino: 'Praga' })

    expect(onDestinoFijado).toHaveBeenCalledTimes(1)
  })
})
