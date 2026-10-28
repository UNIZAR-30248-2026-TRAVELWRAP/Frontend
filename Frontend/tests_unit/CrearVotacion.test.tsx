import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CrearVotacion from '../src/screens/CrearVotacion'
import { VIAJE_ID, llamadas, simularBackendVotaciones, viajeDePrueba } from './backendVotaciones'

const abrir = async (props = {}) => {
  const backend = simularBackendVotaciones({ viaje: viajeDePrueba({ destino: 'Roma', pendiente_destino: false }) })
  render(<CrearVotacion viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)
  await screen.findByText('Crear Votación')
  return backend
}

const rellenar = async (user: ReturnType<typeof userEvent.setup>, pregunta: string, opciones: string[]) => {
  if (pregunta) await user.type(screen.getByLabelText('Pregunta de la votación'), pregunta)
  for (const [i, texto] of opciones.entries()) {
    await user.type(screen.getByLabelText(`Opción ${String.fromCharCode(65 + i)}`), texto)
  }
}

// Cuerpo de la petición con la que se ha creado la votación
const enviada = (fetchMock: ReturnType<typeof vi.fn>) => {
  const [[, peticion]] = llamadas(fetchMock, 'POST', '/votaciones')
  return JSON.parse(peticion?.body as string)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CrearVotacion', () => {
  it('empieza con el tipo Fechas, dos opciones en blanco y todos los miembros como votantes', async () => {
    await abrir()

    expect(screen.getByRole('radio', { name: 'Fechas' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByLabelText('Opción A')).toBeTruthy()
    expect(screen.getByLabelText('Opción B')).toBeTruthy()
    expect(screen.queryByLabelText('Opción C')).toBeNull()
    expect(screen.getByText(/Opcionales: puedes dejarlas en blanco/)).toBeTruthy()
    expect(screen.getByText('Todos los miembros del viaje')).toBeTruthy()
  })

  it('permite añadir opciones y quitarlas todas', async () => {
    const user = userEvent.setup()
    await abrir()

    await user.click(screen.getByRole('button', { name: 'Añadir opción' }))
    expect(screen.getByLabelText('Opción C')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Quitar opción C' }))
    await user.click(screen.getByRole('button', { name: 'Quitar opción B' }))
    await user.click(screen.getByRole('button', { name: 'Quitar opción A' }))
    expect(screen.queryByLabelText(/^Opción [A-Z]$/)).toBeNull()
  })

  it('las opciones son opcionales: se crea sin ninguna y las filas en blanco no se envían', async () => {
    const user = userEvent.setup()
    const onCreada = vi.fn()
    const { fetchMock } = await abrir({ onCreada })

    await rellenar(user, '¿Dónde cenamos el sábado?', [])
    await user.click(screen.getByRole('button', { name: 'Publicar votación' }))

    await vi.waitFor(() => expect(onCreada).toHaveBeenCalled())
    expect(enviada(fetchMock)).toEqual({ titulo: '¿Dónde cenamos el sábado?', tipo: 'fecha', opciones: [] })
    expect(onCreada.mock.calls[0][0].opciones).toEqual([])
  })

  it('con una sola opción escrita se envía solo esa', async () => {
    const user = userEvent.setup()
    const { fetchMock } = await abrir({ onCreada: vi.fn() })

    await rellenar(user, '¿Hotel?', ['Hotel Roma'])
    await user.click(screen.getByRole('button', { name: 'Publicar votación' }))

    await vi.waitFor(() => expect(llamadas(fetchMock, 'POST', '/votaciones')).toHaveLength(1))
    expect(enviada(fetchMock).opciones).toEqual([{ texto: 'Hotel Roma', valor_fecha: null }])
  })

  it('publica la votación con la pregunta, el tipo y las opciones limpias', async () => {
    const user = userEvent.setup()
    const onCreada = vi.fn()
    const { fetchMock } = await abrir({ onCreada })

    await user.click(screen.getByRole('radio', { name: 'Actividades' }))
    await rellenar(user, '  ¿Qué visitamos? ', [' Coliseo ', 'Vaticano'])
    await user.click(screen.getByRole('button', { name: 'Añadir opción' }))
    await user.type(screen.getByLabelText('Opción C'), 'Trastevere')
    await user.click(screen.getByRole('button', { name: 'Publicar votación' }))

    await vi.waitFor(() => expect(onCreada).toHaveBeenCalled())
    expect(enviada(fetchMock)).toEqual({
      titulo: '¿Qué visitamos?',
      tipo: 'actividad',
      opciones: [
        { texto: 'Coliseo', valor_fecha: null },
        { texto: 'Vaticano', valor_fecha: null },
        { texto: 'Trastevere', valor_fecha: null },
      ],
    })
    expect(onCreada.mock.calls[0][0]).toMatchObject({ titulo: '¿Qué visitamos?', estado: 'abierta' })
  })

  it('en las votaciones de fechas cada opción puede llevar su fecha', async () => {
    const user = userEvent.setup()
    const { fetchMock } = await abrir({ onCreada: vi.fn() })

    await rellenar(user, '¿Qué día salimos?', ['Viernes', 'Sábado'])
    await user.type(screen.getByLabelText('Fecha de la opción A'), '2027-05-14')
    await user.click(screen.getByRole('button', { name: 'Publicar votación' }))

    await vi.waitFor(() => expect(llamadas(fetchMock, 'POST', '/votaciones')).toHaveLength(1))
    expect(enviada(fetchMock).opciones).toEqual([
      { texto: 'Viernes', valor_fecha: '2027-05-14' },
      { texto: 'Sábado', valor_fecha: null },
    ])
  })

  it('las fechas solo se piden en las votaciones de fechas', async () => {
    const user = userEvent.setup()
    await abrir()

    await user.click(screen.getByRole('radio', { name: 'Otro' }))

    expect(screen.queryByLabelText('Fecha de la opción A')).toBeNull()
  })

  for (const [caso, pregunta, opciones, mensaje] of [
    ['sin pregunta', '', ['Hotel', 'Apartamento'], 'Escribe la pregunta de la votación'],
    ['con opciones repetidas', '¿Dónde dormimos?', ['Hotel', ' hotel '], 'Las opciones no se pueden repetir'],
  ] as const) {
    it(`no envía una votación ${caso}`, async () => {
      const user = userEvent.setup()
      const { fetchMock } = await abrir()

      await rellenar(user, pregunta, [...opciones])
      await user.click(screen.getByRole('button', { name: 'Publicar votación' }))

      expect(screen.getByRole('alert').textContent).toBe(mensaje)
      expect(llamadas(fetchMock, 'POST', '/votaciones')).toHaveLength(0)
    })
  }

  it('si el servidor la rechaza muestra el motivo y se puede volver a intentar', async () => {
    const user = userEvent.setup()
    const { fetchMock } = await abrir()
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' } }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    await rellenar(user, '¿Dónde dormimos?', ['Hotel', 'Apartamento'])
    await user.click(screen.getByRole('button', { name: 'Publicar votación' }))

    expect((await screen.findByRole('alert')).textContent).toBe('El viaje está cerrado y ya no se puede modificar')
    expect(screen.getByRole('button', { name: 'Publicar votación' })).toHaveProperty('disabled', false)
  })

  it('el botón de volver avisa a la ruta', async () => {
    const user = userEvent.setup()
    const onVolver = vi.fn()
    await abrir({ onVolver })

    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})
