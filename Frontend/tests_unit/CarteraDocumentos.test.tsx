// Test unitario para la pantalla Cartera de Documentos (listado y subida de PDF e imágenes)
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CarteraDocumentos from '../src/screens/CarteraDocumentos'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'

const miembros = [
  { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'creador' },
  { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
]

const documento = (datos: Record<string, unknown>) => ({
  id: 'd1',
  viaje_id: VIAJE_ID,
  nombre: 'Billete de tren.pdf',
  tipo_mime: 'application/pdf',
  tamano_bytes: 248731,
  subido_por: ADRIANA,
  creado_en: '2026-11-08T10:00:00Z',
  ...datos,
})

const LISTA = [
  documento({ id: 'd2', nombre: 'Foto del hotel.png', tipo_mime: 'image/png', tamano_bytes: 1572864, subido_por: BERTA }),
  documento({ id: 'd1' }),
]

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

// Backend simulado: GET del viaje, GET de los documentos y POST de la subida, cada uno con la respuesta indicada
const simularBackend = ({
  viaje = (): Promise<Response> => json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado: 'activo', miembros }),
  lista = (): Promise<Response> => json(200, { documentos: LISTA }),
  subida = (): Promise<Response> => json(201, documento({ id: 'd3', nombre: 'seguro.pdf' })),
} = {}) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    if (url.endsWith('/documentos')) return opciones?.method === 'POST' ? subida() : lista()
    if (url.endsWith('/tareas')) return json(200, { tareas: [] })
    return viaje()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const subidas = (fetchMock: ReturnType<typeof simularBackend>) =>
  fetchMock.mock.calls.filter(([, opciones]) => opciones?.method === 'POST')

const abrir = async (props = {}) => {
  render(<CarteraDocumentos viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)
  await screen.findByText('Documentos del viaje')
}

const selector = () => screen.getByLabelText('Elegir el documento que se va a subir')
const pdf = (nombre = 'seguro.pdf') => new File(['%PDF-1.4'], nombre, { type: 'application/pdf' })
// applyAccept: false deja elegir archivos que el selector no admitiría, como haría un arrastre o un móvil
const usuario = () => userEvent.setup({ applyAccept: false })

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CarteraDocumentos: pestañas', () => {

  it('al cambiar a «Lista de tareas» cambia el título y se muestran las tareas en lugar de los documentos', async () => {
    simularBackend()
    await abrir()

    await userEvent.setup().click(screen.getByRole('tab', { name: 'Lista de tareas' }))

    expect(await screen.findByText('Aún no hay tareas.')).toBeTruthy()
    expect(screen.getByText('Lista de Tareas')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Lista de tareas' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByText('Documentos del viaje')).toBeNull()
  })


})

describe('CarteraDocumentos: listado', () => {

  it('indica «Un antiguo miembro» si quien lo subió ya no tiene cuenta', async () => {
    simularBackend({ lista: () => json(200, { documentos: [documento({ subido_por: null })] }) })
    await abrir()
    expect(screen.getByText('Un antiguo miembro')).toBeTruthy()
  })

  it('muestra el estado vacío si el viaje no tiene documentos', async () => {
    simularBackend({ lista: () => json(200, { documentos: [] }) })
    await abrir()
    expect(screen.getByText('Aún no hay documentos en la cartera del viaje.')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Documentos del viaje' })).toBeNull()
  })

  it('muestra el error si no se pueden cargar los documentos', async () => {
    simularBackend({
      lista: () => json(502, { error: { codigo: 'error_documento', mensaje: 'No se han podido obtener los documentos' } }),
    })
    render(<CarteraDocumentos viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    expect((await screen.findByRole('alert')).textContent).toContain('No se han podido obtener los documentos')
  })
})

describe('CarteraDocumentos: subida', () => {


  it('rechaza en el cliente un tipo no permitido, sin llamar al servidor', async () => {
    const fetchMock = simularBackend()
    await abrir()

    await usuario().upload(selector(), new File(['hola'], 'notas.txt', { type: 'text/plain' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Solo se pueden subir documentos PDF o imágenes JPEG o PNG')
    expect(subidas(fetchMock)).toHaveLength(0)
    expect(within(screen.getByRole('list', { name: 'Documentos del viaje' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('rechaza en el cliente un archivo de más de 8 MB, sin llamar al servidor', async () => {
    const fetchMock = simularBackend()
    await abrir()
    const grande = pdf('enorme.pdf')
    Object.defineProperty(grande, 'size', { value: 8_000_001 })

    await usuario().upload(selector(), grande)

    expect((await screen.findByRole('alert')).textContent).toContain('El documento no puede ocupar más de 8 MB')
    expect(subidas(fetchMock)).toHaveLength(0)
  })

  it('rechaza un archivo vacío', async () => {
    const fetchMock = simularBackend()
    await abrir()

    await usuario().upload(selector(), new File([], 'vacio.pdf', { type: 'application/pdf' }))

    expect((await screen.findByRole('alert')).textContent).toContain('El archivo está vacío')
    expect(subidas(fetchMock)).toHaveLength(0)
  })

  it('admite un archivo sin tipo indicado si su extensión es válida', async () => {
    const fetchMock = simularBackend()
    await abrir()

    await usuario().upload(selector(), new File(['x'], 'foto.JPG', { type: '' }))

    await waitFor(() => expect(subidas(fetchMock)).toHaveLength(1))
  })

  it('muestra el error que devuelve la API y la lista no cambia', async () => {
    simularBackend({
      subida: () =>
        json(400, { error: { codigo: 'tipo_no_permitido', mensaje: 'Solo se pueden subir documentos PDF o imágenes JPEG o PNG' } }),
    })
    await abrir()

    await usuario().upload(selector(), pdf())

    expect((await screen.findByRole('alert')).textContent).toContain(
      'No se ha podido subir el documento: Solo se pueden subir documentos PDF o imágenes JPEG o PNG',
    )
    expect(screen.queryByRole('status')).toBeNull()
    expect(within(screen.getByRole('list', { name: 'Documentos del viaje' })).getAllByRole('listitem')).toHaveLength(2)
  })

})

describe('CarteraDocumentos: viaje finalizado', () => {
  it('muestra los documentos pero no deja subir ninguno', async () => {
    simularBackend({ viaje: () => json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado: 'finalizado', miembros }) })
    await abrir()

    expect(screen.queryByRole('button', { name: 'Subir documento' })).toBeNull()
    expect(screen.queryByLabelText('Elegir el documento que se va a subir')).toBeNull()
    expect(within(screen.getByRole('list', { name: 'Documentos del viaje' })).getAllByRole('listitem')).toHaveLength(2)
  })

})
