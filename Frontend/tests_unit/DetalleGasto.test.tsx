// Test unitario de la pantalla Detalle del gasto
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DetalleGasto from '../src/screens/DetalleGasto'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const GASTO_ID = '9f3c2a1b-7d6e-4f5a-8b9c-0d1e2f3a4b5c'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'
const ANTIGUO = 'a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d'

const miembros = [
  { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'creador' },
  { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
]

// Gasto como lo devuelve GET /viajes/:id/gastos/:gastoId: cada parte con su nombre
const detalle = (datos: Record<string, unknown> = {}) => ({
  id: GASTO_ID,
  viaje_id: VIAJE_ID,
  concepto: 'Cena en el Trastevere',
  importe: 60.5,
  categoria: 'comida',
  pagado_por: BERTA,
  fecha: '2027-05-13',
  creado_por: ADRIANA,
  creado_en: '2026-10-29T10:00:00Z',
  actualizado_en: '2026-10-29T10:00:00Z',
  repartos: [
    { usuario_id: BERTA, nombre: 'Berta', abandonado: false, importe: 30.25 },
    { usuario_id: ADRIANA, nombre: 'Adriana', abandonado: false, importe: 30.25 },
  ],
  ...datos,
})

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

// Backend simulado: el viaje, el gasto (GET), el borrado (DELETE) con la respuesta indicada
const simularBackend = ({
  viaje = (): Promise<Response> => json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado: 'activo', rol: 'miembro', miembros }),
  gasto = (): Promise<Response> => json(200, detalle()),
  borrar = (): Promise<Response> => Promise.resolve(new Response(null, { status: 204 })),
} = {}) => {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') return borrar()
    if (url.endsWith(`/gastos/${GASTO_ID}`)) return gasto()
    return viaje()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const abrir = async (props: Record<string, unknown> = {}) => {
  render(
    <DetalleGasto viajeId={VIAJE_ID} gastoId={GASTO_ID} tokenSesion="token-acceso" usuarioId={ADRIANA} {...props} />,
  )
  await screen.findByRole('region', { name: 'Datos del gasto' })
}

const reparto = () => within(screen.getByRole('list', { name: 'Parte de cada miembro' })).getAllByRole('listitem')

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('DetalleGasto', () => {
  it('pide el viaje y el gasto con el token de la sesión', async () => {
    const fetchMock = simularBackend()
    await abrir()

    const urls = fetchMock.mock.calls.map(([url]) => url)
    expect(urls.some((url) => url.endsWith(`/viajes/${VIAJE_ID}`))).toBe(true)
    expect(urls.some((url) => url.endsWith(`/viajes/${VIAJE_ID}/gastos/${GASTO_ID}`))).toBe(true)
    for (const [, init] of fetchMock.mock.calls as unknown as [string, RequestInit][]) {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-acceso')
    }
  })

  it('muestra importe, concepto, categoría, quién pagó y la fecha', async () => {
    simularBackend()
    await abrir()

    const datos = screen.getByRole('region', { name: 'Datos del gasto' }).textContent ?? ''
    expect(datos).toContain('60,50 €')
    expect(datos).toContain('Cena en el Trastevere')
    expect(datos).toContain('Comida')
    expect(datos).toContain('Berta')
    expect(datos).toContain('13 may')
  })

  it('muestra la parte de cada miembro y marca la tuya', async () => {
    simularBackend()
    await abrir()

    const filas = reparto().map((fila) => fila.textContent)
    expect(filas).toEqual([expect.stringContaining('Berta30,25 €'), expect.stringContaining('Adriana (tú)30,25 €')])
  })

  it('a quien ya dejó el viaje lo muestra como antiguo miembro', async () => {
    simularBackend({
      gasto: () =>
        json(200, detalle({
          repartos: [
            { usuario_id: BERTA, nombre: 'Berta', abandonado: false, importe: 30 },
            { usuario_id: ANTIGUO, nombre: null, abandonado: true, importe: 30.5 },
          ],
        })),
    })
    await abrir()

    expect(reparto()[1].textContent).toContain('Antiguo miembro30,50 €')
  })

  it('si quien usa la app registró el gasto puede modificarlo y eliminarlo', async () => {
    simularBackend()
    await abrir({ onModificar: vi.fn() })

    expect(screen.getByRole('button', { name: 'Modificar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeTruthy()
  })



  it('en un viaje archivado no hay botones aunque lo registrara quien usa la app', async () => {
    simularBackend({
      viaje: () => json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado: 'archivado', rol: 'miembro', miembros }),
    })
    await abrir({ onModificar: vi.fn() })

    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull()
  })



  describe('eliminar', () => {


    it('si el backend rechaza el borrado, el error sale en la confirmación y el gasto sigue', async () => {
      simularBackend({
        borrar: () => json(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está finalizado y ya no se puede modificar' } }),
      })
      const onEliminado = vi.fn()
      await abrir({ onEliminado })

      await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
      await userEvent.click(screen.getByRole('button', { name: 'Eliminar gasto' }))

      expect((await within(screen.getByRole('dialog')).findByRole('alert')).textContent).toBe(
        'El viaje está finalizado y ya no se puede modificar',
      )
      expect(onEliminado).not.toHaveBeenCalled()
    })
  })
})
