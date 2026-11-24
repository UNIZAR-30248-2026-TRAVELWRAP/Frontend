// Test unitario de Añadir Gasto en modo edición: Modificar gasto
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnadirGasto from '../src/screens/AnadirGasto'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const GASTO_ID = '9f3c2a1b-7d6e-4f5a-8b9c-0d1e2f3a4b5c'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'
const DANIEL = '8c4d2e1f-3a5b-4c6d-9e7f-1a2b3c4d5e6f'
const ANTIGUO = 'a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d'

const miembros = [
  { usuario_id: DANIEL, nombre: 'Daniel', avatar_url: null, rol: 'creador' },
  { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
]

// El gasto a modificar: pagó Berta y se dividió entre Berta y Adriana (no entre Daniel)
const GASTO = {
  id: GASTO_ID,
  viaje_id: VIAJE_ID,
  concepto: 'Cena en el Trastevere',
  importe: 60.5,
  categoria: 'entradas',
  pagado_por: BERTA,
  fecha: '2027-05-13',
  creado_por: ADRIANA,
  creado_en: '2026-10-29T10:00:00Z',
  actualizado_en: '2026-10-29T10:00:00Z',
  repartos: [
    { usuario_id: BERTA, importe: 30.25 },
    { usuario_id: ADRIANA, importe: 30.25 },
  ],
}

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

// Backend simulado: GET del viaje y PATCH del gasto con la respuesta indicada
const simularBackend = ({
  viaje = (): Promise<Response> => json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado: 'activo', miembros }),
  editar = (cuerpo: Record<string, unknown>): Promise<Response> => json(200, { ...GASTO, ...cuerpo }),
} = {}) => {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    init?.method === 'PATCH' ? editar(JSON.parse(init.body as string)) : viaje(),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const enviados = (fetchMock: ReturnType<typeof simularBackend>) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PATCH')
    .map(([url, init]) => ({ url, cuerpo: JSON.parse(init?.body as string) }))

const abrir = async (gastoInicial = GASTO, props = {}) => {
  render(
    <AnadirGasto
      viajeId={VIAJE_ID}
      tokenSesion="token-acceso"
      usuarioId={ADRIANA}
      gastoInicial={gastoInicial}
      {...props}
    />,
  )
  await screen.findByRole('radiogroup', { name: 'Quién pagó' })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AnadirGasto en modo edición', () => {
  it('muestra el título y el botón de modificar', async () => {
    simularBackend()
    await abrir()

    expect(screen.getByText('Modificar gasto')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy()
    expect(screen.queryByText('Añadir Gasto')).toBeNull()
  })




  it('al guardar envía PATCH al gasto con los cambios y conserva su fecha', async () => {
    const fetchMock = simularBackend()
    await abrir()

    await userEvent.clear(screen.getByLabelText('Importe'))
    await userEvent.type(screen.getByLabelText('Importe'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await vi.waitFor(() => expect(enviados(fetchMock)).toHaveLength(1))
    const [{ url, cuerpo }] = enviados(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/gastos/${GASTO_ID}$`))
    expect(cuerpo).toEqual({
      concepto: 'Cena en el Trastevere',
      importe: 25,
      categoria: 'entradas',
      pagado_por: BERTA,
      participantes: [BERTA, ADRIANA],
      fecha: '2027-05-13',
    })
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })


  it('mantiene los avisos de importe: un importe no válido no se envía', async () => {
    const fetchMock = simularBackend()
    await abrir()

    await userEvent.clear(screen.getByLabelText('Importe'))
    await userEvent.type(screen.getByLabelText('Importe'), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('El importe tiene que ser mayor que 0')).toBeTruthy()
    expect(enviados(fetchMock)).toHaveLength(0)
  })

  it('si el backend rechaza el cambio, muestra su motivo y sigue en el formulario', async () => {
    simularBackend({
      editar: () => json(403, { error: { codigo: 'sin_permiso', mensaje: 'Solo puede editar el gasto quien lo registró o el creador del viaje' } }),
    })
    const onGuardado = vi.fn()
    await abrir(GASTO, { onGuardado })

    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Solo puede editar el gasto quien lo registró o el creador del viaje')).toBeTruthy()
    expect(onGuardado).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy()
  })
})
