// Test unitario para la pantalla Control de Gastos (total e historial)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ControlGastos from '../src/screens/ControlGastos'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'
const DANIEL = '8c4d2e1f-3a5b-4c6d-9e7f-1a2b3c4d5e6f'

const miembros = [
  { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'creador' },
  { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
]

const gasto = (datos: Record<string, unknown>) => ({
  id: 'g1',
  viaje_id: VIAJE_ID,
  concepto: 'Cena',
  importe: 60.5,
  categoria: 'comida',
  pagado_por: ADRIANA,
  fecha: '2027-05-13',
  creado_por: ADRIANA,
  creado_en: '2026-10-29T10:00:00Z',
  actualizado_en: '2026-10-29T10:00:00Z',
  repartos: [],
  ...datos,
})

const HISTORIAL = [
  gasto({ id: 'g2', concepto: 'Taxi al aeropuerto', importe: 35, categoria: 'transporte', pagado_por: BERTA }),
  gasto({ id: 'g1', concepto: 'Cena en el Trastevere', fecha: '2027-05-12' }),
]

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

// Backend simulado: GET del viaje y GET del historial, cada uno con la respuesta indicada
const simularBackend = ({
  viaje = (): Promise<Response> => json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado: 'activo', miembros }),
  historial = (): Promise<Response> => json(200, { gastos: HISTORIAL, total: 95.5 }),
  balance = (): Promise<Response> => json(200, { saldos: [] }),
  liquidacion = (): Promise<Response> => json(200, { transferencias: [] }),
} = {}) => {
  const fetchMock = vi.fn((url: string) => {
    if (url.endsWith('/gastos/balance')) return balance()
    if (url.endsWith('/gastos/liquidacion')) return liquidacion()
    return url.endsWith('/gastos') ? historial() : viaje()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const abrir = async (props = {}) => {
  render(<ControlGastos viajeId={VIAJE_ID} tokenSesion="token-acceso" usuarioId={ADRIANA} {...props} />)
  await screen.findByRole('region', { name: 'Total gastado' })
}

const filas = () => within(screen.getByRole('list', { name: 'Historial de gastos' })).getAllByRole('listitem')

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ControlGastos', () => {
  it('pide el viaje y su historial con el token de la sesión', async () => {
    const fetchMock = simularBackend()
    await abrir()

    const urls = fetchMock.mock.calls.map(([url]) => url)
    expect(urls.some((url) => url.endsWith(`/viajes/${VIAJE_ID}`))).toBe(true)
    expect(urls.some((url) => url.endsWith(`/viajes/${VIAJE_ID}/gastos`))).toBe(true)
    for (const [, init] of fetchMock.mock.calls as unknown as [string, RequestInit][]) {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-acceso')
    }
  })

  it('muestra el total gastado con dos decimales', async () => {
    simularBackend()
    await abrir()

    expect(screen.getByRole('region', { name: 'Total gastado' }).textContent).toContain('95,50 €')
  })

  it('muestra el historial en el orden que lo devuelve el backend, con concepto, quién pagó, fecha e importe', async () => {
    simularBackend()
    await abrir()

    const [primera, segunda] = filas()
    expect(primera.textContent).toContain('Taxi al aeropuerto')
    expect(primera.textContent).toContain('Pagó Berta · 13 may')
    expect(primera.textContent).toContain('35,00 €')
    expect(segunda.textContent).toContain('Cena en el Trastevere')
    expect(segunda.textContent).toContain('Pagó Adriana · 12 may')
    expect(segunda.textContent).toContain('60,50 €')
  })

  it('con importes de diez cifras separa los miles, no parte el total y reduce su tamaño', async () => {
    simularBackend({
      historial: () =>
        json(200, { gastos: [gasto({ importe: 9999999999.99 }), gasto({ id: 'g2', importe: 150.6 })], total: 10000000150.59 }),
    })
    await abrir()

    const region = screen.getByRole('region', { name: 'Total gastado' })
    const total = within(region).getByText('10.000.000.150,59 €')
    expect(total.style.whiteSpace).toBe('nowrap')
    expect(Number.parseInt(total.style.fontSize)).toBeLessThan(34)
    expect(filas()[0].textContent).toContain('9.999.999.999,99 €')
  })

  it('con importes cortos el total mantiene su tamaño', async () => {
    simularBackend()
    await abrir()

    expect(within(screen.getByRole('region', { name: 'Total gastado' })).getByText('95,50 €').style.fontSize).toBe('34px')
  })

  it('si quien pagó ya no es miembro del viaje, lo indica', async () => {
    simularBackend({
      historial: () => json(200, { gastos: [gasto({ pagado_por: 'antiguo-miembro' })], total: 60.5 }),
    })
    await abrir()

    expect(filas()[0].textContent).toContain('Pagó Un antiguo miembro')
  })

  it('si el viaje aún no tiene gastos lo dice y el total es 0', async () => {
    simularBackend({ historial: () => json(200, { gastos: [], total: 0 }) })
    await abrir()

    expect(screen.getByText('Todavía no hay gastos en este viaje.')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Historial de gastos' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Total gastado' }).textContent).toContain('0,00 €')
  })

  it('el botón Añadir Gasto avisa a quien abrió la pantalla', async () => {
    simularBackend()
    const onAnadirGasto = vi.fn()
    const user = userEvent.setup()
    await abrir({ onAnadirGasto })

    await user.click(screen.getByRole('button', { name: 'Añadir Gasto' }))

    expect(onAnadirGasto).toHaveBeenCalledTimes(1)
  })

  it.each(['archivado', 'finalizado'])('en un viaje %s se consultan los gastos pero no se pueden añadir', async (estado) => {
    simularBackend({ viaje: () => json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado, miembros }) })
    await abrir()

    expect(filas()).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Añadir Gasto' })).toBeNull()
    expect(screen.getByText(/se pueden consultar sus gastos, pero ya no se pueden añadir/)).toBeTruthy()
  })

  it('si no se pueden cargar los gastos lo explica', async () => {
    simularBackend({
      historial: () => json(404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } }),
    })
    render(<ControlGastos viajeId={VIAJE_ID} tokenSesion="token-acceso" usuarioId={ADRIANA} />)

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se han podido cargar los gastos: El viaje no existe o no perteneces a él',
    )
    expect(screen.queryByRole('region', { name: 'Total gastado' })).toBeNull()
  })

  it('marca Gastos en la barra inferior y avisa al cambiar de sección', async () => {
    simularBackend()
    const onCambiarSeccion = vi.fn()
    const user = userEvent.setup()
    await abrir({ onCambiarSeccion })

    expect(screen.getByRole('button', { name: 'Gastos' }).getAttribute('aria-current')).toBe('page')
    await user.click(screen.getByRole('button', { name: 'Itinerario' }))

    expect(onCambiarSeccion).toHaveBeenCalledWith('itinerario')
  })

  it('el botón de volver avisa a quien abrió la pantalla', async () => {
    simularBackend()
    const onVolver = vi.fn()
    const user = userEvent.setup()
    await abrir({ onVolver })

    await user.click(screen.getByRole('button', { name: 'Volver a Mis Viajes' }))

    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})

// Balance (PB-25): Tu saldo y el saldo de cada miembro
describe('ControlGastos · balance', () => {
  const saldo = (usuarioId: string, nombre: string | null, valor: number) => ({
    usuario_id: usuarioId,
    nombre,
    pagado: Math.max(valor, 0),
    parte: Math.max(-valor, 0),
    saldo: valor,
  })

  const conSaldos = (saldos: unknown[]) => simularBackend({ balance: () => json(200, { saldos }) })

  const tuSaldo = () => screen.getByRole('group', { name: 'Tu saldo' })
  const saldoDe = (nombre: string) =>
    within(screen.getByRole('list', { name: 'Saldo de cada miembro' }))
      .getAllByRole('listitem')
      .find((fila) => fila.textContent?.includes(nombre))

  it('pide el balance del viaje con el token de la sesión', async () => {
    const fetchMock = conSaldos([])
    await abrir()

    const [url, init] = fetchMock.mock.calls.find(([u]) => u.endsWith('/gastos/balance')) as unknown as [string, RequestInit]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/gastos/balance$`))
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-acceso')
  })

  it('muestra en positivo «Tu saldo» cuando te deben', async () => {
    conSaldos([saldo(BERTA, 'Berta', -30), saldo(ADRIANA, 'Adriana', 30)])
    await abrir()

    expect(tuSaldo().textContent).toContain('+30,00 €')
    expect(tuSaldo().textContent).toContain('Te deben')
  })

  it('muestra en negativo «Tu saldo» cuando debes', async () => {
    conSaldos([saldo(BERTA, 'Berta', 25), saldo(ADRIANA, 'Adriana', -25)])
    await abrir()

    expect(tuSaldo().textContent).toContain('-25,00 €')
    expect(tuSaldo().textContent).toContain('Debes')
  })

  it('con saldo 0 indica que estás al día', async () => {
    conSaldos([saldo(BERTA, 'Berta', 0), saldo(ADRIANA, 'Adriana', 0)])
    await abrir()

    expect(tuSaldo().textContent).toContain('0,00 €')
    expect(tuSaldo().textContent).toContain('Al día')
  })

  it('muestra el saldo de cada miembro con su signo, en el orden del backend', async () => {
    conSaldos([saldo(BERTA, 'Berta', 40), saldo(ADRIANA, 'Adriana', -40)])
    await abrir()

    const filasSaldo = within(screen.getByRole('list', { name: 'Saldo de cada miembro' })).getAllByRole('listitem')
    expect(filasSaldo.map((fila) => fila.textContent)).toEqual([
      expect.stringContaining('Berta+40,00 €'),
      expect.stringContaining('Adriana-40,00 €'),
    ])
  })

  it('a quien ya dejó el viaje lo muestra como antiguo miembro', async () => {
    conSaldos([saldo(BERTA, 'Berta', -10), saldo(ADRIANA, 'Adriana', 0), saldo('antiguo', null, 10)])
    await abrir()

    expect(saldoDe('Antiguo miembro')?.textContent).toContain('+10,00 €')
  })

  it('si quien usa la app no aparece en el balance no muestra «Tu saldo»', async () => {
    conSaldos([saldo(BERTA, 'Berta', 0)])
    await abrir()

    expect(screen.queryByRole('group', { name: 'Tu saldo' })).toBeNull()
    expect(saldoDe('Berta')?.textContent).toContain('0,00 €')
  })

  it('con saldos de diez cifras «Tu saldo» puede bajar debajo del total y la cifra no se parte', async () => {
    conSaldos([saldo(BERTA, 'Berta', -5000000075.3), saldo(ADRIANA, 'Adriana', 5000000075.3)])
    await abrir()

    expect(tuSaldo().parentElement?.style.flexWrap).toBe('wrap')
    expect(within(tuSaldo()).getByText('+5.000.000.075,30 €').style.whiteSpace).toBe('nowrap')
    expect(saldoDe('Berta')?.textContent).toContain('-5.000.000.075,30 €')
  })

  it('sin saldos no muestra la lista de saldos', async () => {
    conSaldos([])
    await abrir()

    expect(screen.queryByRole('list', { name: 'Saldo de cada miembro' })).toBeNull()
  })

  it('si no se puede calcular el balance lo explica', async () => {
    simularBackend({
      balance: () => json(502, { error: { codigo: 'error_gasto', mensaje: 'No se ha podido calcular el balance' } }),
    })
    render(<ControlGastos viajeId={VIAJE_ID} tokenSesion="token-acceso" usuarioId={ADRIANA} />)

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se han podido cargar los gastos: No se ha podido calcular el balance',
    )
  })
})

// Liquidación pendiente: transferencias para saldar el viaje, con las tuyas destacadas
describe('ControlGastos · liquidación', () => {
  const transferencia = (de: string, deNombre: string | null, a: string, aNombre: string | null, importe: number) => ({
    de,
    de_nombre: deNombre,
    a,
    a_nombre: aNombre,
    importe,
  })
  const conTransferencias = (transferencias: unknown[]) =>
    simularBackend({ liquidacion: () => json(200, { transferencias }) })

  const seccion = () => screen.getByRole('region', { name: 'Liquidación pendiente' })
  const filasLiquidacion = () =>
    within(screen.getByRole('list', { name: 'Transferencias pendientes' })).getAllByRole('listitem')

  it('pide la liquidación del viaje con el token de la sesión', async () => {
    const fetchMock = simularBackend()
    await abrir()

    const [url, init] = fetchMock.mock.calls.find(([u]) => u.endsWith('/gastos/liquidacion')) as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/gastos/liquidacion$`))
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-acceso')
  })

  it('sin transferencias dice que las cuentas están saldadas', async () => {
    simularBackend()
    await abrir()

    expect(seccion().textContent).toContain('Cuentas saldadas')
    expect(screen.queryByRole('list', { name: 'Transferencias pendientes' })).toBeNull()
  })

  it('muestra cada transferencia con quién paga, a quién y cuánto', async () => {
    conTransferencias([transferencia(BERTA, 'Berta', DANIEL, 'Daniel', 1234.5)])
    await abrir()

    expect(filasLiquidacion().map((fila) => fila.textContent)).toEqual([
      expect.stringContaining('Berta paga a Daniel1.234,50 €'),
    ])
  })

  it('si la transferencia es tuya dice «Tú pagas a…» y la destaca', async () => {
    conTransferencias([transferencia(ADRIANA, 'Adriana', BERTA, 'Berta', 30)])
    await abrir()

    const [fila] = filasLiquidacion()
    expect(fila.textContent).toContain('Tú pagas a Berta30,00 €')
    expect(fila.style.background).not.toBe('')
  })

  it('si te paga a ti dice «… te paga a ti»', async () => {
    conTransferencias([transferencia(BERTA, 'Berta', ADRIANA, 'Adriana', 12)])
    await abrir()

    expect(filasLiquidacion()[0].textContent).toContain('Berta te paga a ti12,00 €')
  })

  it('a quien ya dejó el viaje lo nombra como un antiguo miembro', async () => {
    conTransferencias([transferencia('antiguo', null, BERTA, 'Berta', 7)])
    await abrir()

    expect(filasLiquidacion()[0].textContent).toContain('Un antiguo miembro paga a Berta7,00 €')
  })

  it('si no se puede calcular la liquidación lo explica', async () => {
    simularBackend({
      liquidacion: () => json(502, { error: { codigo: 'error_gasto', mensaje: 'No se ha podido calcular la liquidación' } }),
    })
    render(<ControlGastos viajeId={VIAJE_ID} tokenSesion="token-acceso" usuarioId={ADRIANA} />)

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se han podido cargar los gastos: No se ha podido calcular la liquidación',
    )
  })
})
