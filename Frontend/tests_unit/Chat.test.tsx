// Test unitario de la pantalla Chat: conversación, envío, mensajes en tiempo real e historial
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chat from '../src/screens/Chat'
import { escucharMensajes } from '../src/services/chatTiempoReal'

vi.mock('../src/services/chatTiempoReal', () => ({ escucharMensajes: vi.fn(() => () => {}) }))

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const viaje = (estado = 'activo') => ({
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 850,
  estado,
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'miembro',
  miembros: [
    { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
})

const mensaje = (id: string, texto: string, autorId = BERTA, nombre = 'Berta', creadoEn = '2026-05-12T10:00:00Z') => ({
  id,
  texto,
  creado_en: creadoEn,
  autor: { usuario_id: autorId, nombre, avatar_url: null },
})

// Backend simulado: el viaje, el historial (y su página anterior) y el envío de un mensaje
const simularBackend = ({
  estado = 'activo',
  historial = [mensaje('m1', 'Hola a todos')],
  anteriores = [] as ReturnType<typeof mensaje>[],
} = {}) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'POST') {
      const { texto } = JSON.parse(opciones.body as string) as { texto: string }
      return json(201, mensaje(`nuevo-${texto}`, texto, ADRIANA, 'Adriana', '2026-05-12T10:05:00Z'))
    }
    if (url.includes('/mensajes')) return json(200, { mensajes: url.includes('antes=') ? anteriores : historial })
    return json(200, viaje(estado))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const abrir = async () => {
  render(<Chat viajeId={VIAJE_ID} tokenSesion="token-acceso" usuarioId={ADRIANA} />)
  await screen.findByRole('list', { name: 'Mensajes' })
}

const lista = () => screen.getByRole('list', { name: 'Mensajes' })

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Chat · conversación', () => {
  it('muestra los mensajes del grupo con el nombre de quien los escribe', async () => {
    simularBackend({ historial: [mensaje('m1', 'Hola a todos'), mensaje('m2', 'Llego mañana', ADRIANA, 'Adriana')] })
    await abrir()

    expect(await within(lista()).findByText('Hola a todos')).toBeTruthy()
    expect(within(lista()).getByText('Berta')).toBeTruthy()
    expect(within(lista()).getByText('Llego mañana')).toBeTruthy()
    expect(within(lista()).queryByText('Adriana')).toBeNull()
  })

  it('los mensajes de los demás llevan la inicial de su avatar, y los propios no', async () => {
    simularBackend({ historial: [mensaje('m1', 'Hola a todos'), mensaje('m2', 'Llego mañana', ADRIANA, 'Adriana')] })
    await abrir()

    expect(await within(lista()).findByText('B')).toBeTruthy()
    expect(within(lista()).queryByText('A')).toBeNull()
  })

  it('al abrir el chat lo marca como leído en este dispositivo', async () => {
    simularBackend()
    await abrir()

    await waitFor(() => expect(localStorage.getItem(`travelwrap.chatLeido.${VIAJE_ID}`)).not.toBeNull())
  })

  it('con el viaje sin mensajes lo dice', async () => {
    simularBackend({ historial: [] })
    render(<Chat viajeId={VIAJE_ID} tokenSesion="token-acceso" usuarioId={ADRIANA} />)

    expect(await screen.findByText('Todavía no hay mensajes. ¡Escribe el primero!')).toBeTruthy()
  })
})

describe('Chat · enviar', () => {
  it('envía el texto sin espacios sobrantes y lo añade a la conversación', async () => {
    const fetchMock = simularBackend()
    await abrir()

    await userEvent.type(screen.getByLabelText('Mensaje'), '  Vale  ')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await within(lista()).findByText('Vale')).toBeTruthy()
    const [, opciones] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST') as unknown as [string, RequestInit]
    expect(JSON.parse(opciones.body as string)).toEqual({ texto: 'Vale' })
    expect((screen.getByLabelText('Mensaje') as HTMLInputElement).value).toBe('')
  })

  it('no envía un texto vacío', async () => {
    const fetchMock = simularBackend()
    await abrir()

    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveProperty('disabled', true)
    expect(fetchMock.mock.calls.some(([, o]) => o?.method === 'POST')).toBe(false)
  })

})



