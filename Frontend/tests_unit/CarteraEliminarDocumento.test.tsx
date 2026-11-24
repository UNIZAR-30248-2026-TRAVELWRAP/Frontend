// Test unitario de eliminar un documento de la Cartera: botón, diálogo de confirmación y respuestas de la API
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CarteraDocumentos from '../src/screens/CarteraDocumentos'
import { ApiError } from '../src/services/authApi'
import { eliminarDocumento } from '../src/services/documentosApi'
import { mensajeAlEliminar } from '../src/utils/documentos'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'

const miembros = [{ usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'creador' }]

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

const LISTA = [documento({ id: 'd2', nombre: 'Seguro.pdf' }), documento({ id: 'd1' })]

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))
const sinContenido = () => Promise.resolve(new Response(null, { status: 204 }))
const errorApi = (estado: number, codigo: string, mensaje: string) => json(estado, { error: { codigo, mensaje } })

// Backend simulado: viaje, lista de documentos y DELETE de un documento con la respuesta indicada
const simularBackend = ({
  estado = 'activo',
  borrado = sinContenido,
}: { estado?: string; borrado?: () => Promise<Response> } = {}) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'DELETE') return borrado()
    if (url.endsWith('/documentos')) return json(200, { documentos: LISTA })
    return json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado, miembros })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const borrados = (fetchMock: ReturnType<typeof simularBackend>) =>
  fetchMock.mock.calls.filter(([, opciones]) => opciones?.method === 'DELETE')

const abrir = async () => {
  render(<CarteraDocumentos viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
  await screen.findByText('Documentos del viaje')
}

const filas = () => within(screen.getByRole('list', { name: 'Documentos del viaje' })).getAllByRole('listitem')
const pulsarPapelera = () => userEvent.click(screen.getByRole('button', { name: 'Eliminar Billete de tren.pdf' }))
const confirmar = () => userEvent.click(screen.getByRole('button', { name: 'Eliminar documento' }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CarteraDocumentos: botón de eliminar', () => {
  it('hay un botón de eliminar por documento con el viaje activo', async () => {
    simularBackend()
    await abrir()
    expect(screen.getByRole('button', { name: 'Eliminar Billete de tren.pdf' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Eliminar Seguro.pdf' })).toBeTruthy()
  })

  it('no hay botón con el viaje finalizado', async () => {
    simularBackend({ estado: 'finalizado' })
    await abrir()
    expect(filas()).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /^Eliminar / })).toBeNull()
  })
})

describe('CarteraDocumentos: diálogo de confirmación', () => {
  it('al pulsar el botón se abre el diálogo con el nombre del documento', async () => {
    simularBackend()
    await abrir()

    await pulsarPapelera()

    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByText('¿Eliminar este documento?')).toBeTruthy()
    expect(dialogo.textContent).toContain('Se eliminará Billete de tren.pdf de la cartera para todos los viajeros.')
    expect(dialogo.textContent).toContain('Esta acción no se puede deshacer.')
  })

  it('«Cancelar» cierra el diálogo sin llamar a la API', async () => {
    const fetchMock = simularBackend()
    await abrir()
    await pulsarPapelera()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(borrados(fetchMock)).toHaveLength(0)
    expect(filas()).toHaveLength(2)
  })

  it('al confirmar llama a la API con los ids, quita el documento y muestra el aviso', async () => {
    const fetchMock = simularBackend()
    await abrir()
    await pulsarPapelera()

    await confirmar()

    expect((await screen.findByRole('status')).textContent).toContain('Documento eliminado')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(filas()).toHaveLength(1)
    expect(filas()[0].textContent).toContain('Seguro.pdf')
    const [[url, opciones]] = borrados(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/documentos/d1$`))
    expect(JSON.stringify(opciones?.headers)).toContain('token-acceso')
  })

  it('mientras se borra, los botones están desactivados y dicen «Eliminando...»', async () => {
    let terminar: () => void = () => {}
    simularBackend({ borrado: () => new Promise<Response>((resolver) => (terminar = () => resolver(new Response(null, { status: 204 })))) })
    await abrir()
    await pulsarPapelera()

    await confirmar()

    const eliminando = await screen.findByRole('button', { name: 'Eliminando...' })
    expect((eliminando as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true)
    terminar()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('CarteraDocumentos: errores al eliminar', () => {
  it('502: el error sale en el diálogo y el documento sigue en la lista', async () => {
    simularBackend({ borrado: () => errorApi(502, 'error_documento', 'No se ha podido eliminar el documento') })
    await abrir()
    await pulsarPapelera()

    await confirmar()

    const dialogo = await screen.findByRole('dialog')
    expect((await within(dialogo).findByRole('alert')).textContent).toContain(
      'No se ha podido eliminar el documento: No se ha podido eliminar el documento',
    )
    expect((within(dialogo).getByRole('button', { name: 'Eliminar documento' }) as HTMLButtonElement).disabled).toBe(false)
    expect(filas()).toHaveLength(2)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('404: otro miembro ya lo eliminó, así que se quita de la lista y se avisa', async () => {
    simularBackend({ borrado: () => errorApi(404, 'documento_no_encontrado', 'El documento no existe en este viaje') })
    await abrir()
    await pulsarPapelera()

    await confirmar()

    expect((await screen.findByRole('status')).textContent).toContain('Este documento ya lo había eliminado otro miembro')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(filas()).toHaveLength(1)
  })

})


