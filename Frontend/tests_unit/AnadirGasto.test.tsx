// Test unitario de la pantalla AnadirGasto
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnadirGasto from '../src/screens/AnadirGasto'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'
const DANIEL = '8c4d2e1f-3a5b-4c6d-9e7f-1a2b3c4d5e6f'

const miembros = [
  { usuario_id: DANIEL, nombre: 'Daniel', avatar_url: null, rol: 'creador' },
  { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
]

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

// Backend simulado: GET del viaje con sus miembros y POST del gasto con la respuesta indicada
const simularBackend = ({
  viaje = (): Promise<Response> => json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado: 'activo', miembros }),
  gasto = (cuerpo: Record<string, unknown>): Promise<Response> => json(201, { id: 'g1', ...cuerpo, repartos: [] }),
} = {}) => {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    init?.method === 'POST' ? gasto(JSON.parse(init.body as string)) : viaje(),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Cuerpos de los POST enviados al backend
const enviados = (fetchMock: ReturnType<typeof simularBackend>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => JSON.parse(init?.body as string))

const abrir = async (props = {}) => {
  render(<AnadirGasto viajeId={VIAJE_ID} tokenSesion="token-acceso" usuarioId={ADRIANA} {...props} />)
  await screen.findByRole('radiogroup', { name: 'Quién pagó' })
}

const parteDe = (nombre: string) =>
  within(screen.getByLabelText(`Dividir con ${nombre}`).closest('label') as HTMLElement).queryByText(/€$/)?.textContent

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AnadirGasto', () => {
  it('empieza con Comida, pagando quien registra el gasto y dividido entre todos los miembros', async () => {
    simularBackend()
    await abrir()

    expect(screen.getByText('Añadir Gasto')).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Comida' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Adriana' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Daniel' }).getAttribute('aria-checked')).toBe('false')
    for (const nombre of ['Daniel', 'Berta', 'Adriana']) {
      expect((screen.getByLabelText(`Dividir con ${nombre}`) as HTMLInputElement).checked).toBe(true)
    }
  })

  it('pide el viaje con el token de la sesión', async () => {
    const fetchMock = simularBackend()
    await abrir()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}$`))
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-acceso')
  })

  it('si quien registra no es miembro, propone como pagador al primer miembro', async () => {
    simularBackend()
    await abrir({ usuarioId: 'otro-usuario' })

    expect(screen.getByRole('radio', { name: 'Daniel' }).getAttribute('aria-checked')).toBe('true')
  })

  it('muestra la parte de cada uno, con los céntimos que sobran para los primeros', async () => {
    simularBackend()
    const user = userEvent.setup()
    await abrir()

    await user.type(screen.getByLabelText('Importe'), '10')

    expect(parteDe('Daniel')).toBe('3,34 €')
    expect(parteDe('Berta')).toBe('3,33 €')
    expect(parteDe('Adriana')).toBe('3,33 €')
  })

  it('recalcula las partes al quitar a alguien del reparto y a esa persona no le muestra parte', async () => {
    simularBackend()
    const user = userEvent.setup()
    await abrir()

    await user.type(screen.getByLabelText('Importe'), '10')
    await user.click(screen.getByLabelText('Dividir con Berta'))

    expect(parteDe('Daniel')).toBe('5 €')
    expect(parteDe('Berta')).toBeUndefined()
    expect(parteDe('Adriana')).toBe('5 €')
  })



  const casosInvalidos: [string, string, string, string[], string][] = [
    ['sin importe', '', 'Cena', [], 'Escribe el importe del gasto'],
    ['con importe 0', '0', 'Cena', [], 'El importe tiene que ser mayor que 0'],
    ['con importe negativo', '-20', 'Cena', [], 'El importe no puede ser negativo'],
    ['con tres decimales', '10,123', 'Cena', [], 'Como máximo dos decimales'],
    ['sin concepto', '10', '   ', [], 'Escribe el concepto del gasto'],
    ['sin nadie en el reparto', '10', 'Cena', ['Daniel', 'Berta', 'Adriana'], 'Elige al menos un miembro entre los que dividir el gasto'],
  ]

  it.each(casosInvalidos)('no envía el gasto %s y explica el motivo', async (_caso, importe, concepto, quitar, mensaje) => {
    const fetchMock = simularBackend()
    const onRegistrado = vi.fn()
    const user = userEvent.setup()
    await abrir({ onRegistrado })

    if (importe) await user.type(screen.getByLabelText('Importe'), importe)
    if (concepto) await user.type(screen.getByLabelText('Concepto'), concepto)
    for (const nombre of quitar) await user.click(screen.getByLabelText(`Dividir con ${nombre}`))
    await user.click(screen.getByRole('button', { name: 'Registrar gasto' }))

    expect(screen.getByRole('alert').textContent).toBe(mensaje)
    expect(enviados(fetchMock)).toEqual([])
    expect(onRegistrado).not.toHaveBeenCalled()
  })


  it.each([
    ['-20', 'El importe no puede ser negativo'],
    ['abc', 'Escribe solo números, con coma o punto para los decimales'],
    ['1,234', 'Como máximo dos decimales'],
  ])('al escribir «%s» avisa debajo del importe sin esperar a registrar', async (texto, mensaje) => {
    simularBackend()
    const user = userEvent.setup()
    await abrir()

    const importe = screen.getByLabelText('Importe')
    await user.type(importe, texto)

    const aviso = screen.getByRole('alert')
    expect(aviso.textContent).toBe(mensaje)
    expect(importe.getAttribute('aria-invalid')).toBe('true')
    expect(importe.getAttribute('aria-describedby')).toBe(aviso.id)
  })


  it('el concepto avisa al salir del campo si está vacío', async () => {
    simularBackend()
    const user = userEvent.setup()
    await abrir()

    await user.click(screen.getByLabelText('Concepto'))
    await user.tab()

    expect(screen.getByRole('alert').textContent).toBe('Escribe el concepto del gasto')
    expect(screen.getByLabelText('Concepto').getAttribute('aria-invalid')).toBe('true')
  })

  it('al registrar con errores lleva el foco al primer campo que está mal', async () => {
    simularBackend()
    const user = userEvent.setup()
    await abrir()

    await user.type(screen.getByLabelText('Importe'), '10')
    await user.click(screen.getByRole('button', { name: 'Registrar gasto' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Concepto'))

    await user.clear(screen.getByLabelText('Importe'))
    await user.click(screen.getByRole('button', { name: 'Registrar gasto' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Importe'))
  })



})
