import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnadirActividad from '../src/screens/AnadirActividad'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ACTIVIDAD_ID = '8a1b2c3d-0000-4000-8000-000000000020'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  )

const viaje = (datos: Record<string, unknown> = {}) => ({
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-14',
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'miembro',
  miembros: [{ usuario_id: 'u1', nombre: 'Adriana', avatar_url: null, rol: 'creador' }],
  ...datos,
})

const actividad = (datos: Record<string, unknown> = {}) => ({
  id: ACTIVIDAD_ID,
  viaje_id: VIAJE_ID,
  titulo: 'Visita al Coliseo',
  descripcion: null,
  fecha: '2027-05-12',
  hora_inicio: '10:00:00',
  hora_fin: '12:00:00',
  orden: 0,
  ubicacion_nombre: 'Piazza del Colosseo',
  latitud: null,
  longitud: null,
  lugar_externo_id: null,
  categoria: 'cultura',
  creado_por: 'u1',
  creado_en: '2026-10-24T10:00:00Z',
  actualizado_en: '2026-10-24T10:00:00Z',
  ...datos,
})

const simularBackend = (
  datosViaje: Record<string, unknown> = {},
  actividades: unknown[] = [actividad()],
  patch: () => Promise<Response> = () => respuesta(200, actividad()),
) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'PATCH') return patch()
    return url.includes('/actividades') ? respuesta(200, { actividades }) : respuesta(200, viaje(datosViaje))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const renderizar = (props: Partial<Parameters<typeof AnadirActividad>[0]> = {}) =>
  render(<AnadirActividad viajeId={VIAJE_ID} actividadId={ACTIVIDAD_ID} tokenSesion="token-acceso" {...props} />)

const botonGuardar = () => screen.getByRole('button', { name: /Guardar cambios|Guardando/ })

const llamadasPatch = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.filter(([, opciones]) => (opciones as RequestInit | undefined)?.method === 'PATCH') as unknown as [
    string,
    RequestInit & { headers: Record<string, string> },
  ][]

const cuerpoDelPatch = (fetchMock: ReturnType<typeof vi.fn>) =>
  JSON.parse(llamadasPatch(fetchMock)[0][1].body as string)

const esperarFormulario = () => screen.findByLabelText('Nombre de la actividad')

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AnadirActividad · modo edición', () => {
  it('cambia el título y rellena el formulario con los datos de la actividad', async () => {
    simularBackend()
    renderizar()

    expect(((await esperarFormulario()) as HTMLInputElement).value).toBe('Visita al Coliseo')
    expect(screen.getByText('Editar Actividad')).toBeTruthy()
    expect((screen.getByLabelText('Lugar / Dirección') as HTMLInputElement).value).toBe('Piazza del Colosseo')
    expect((screen.getByLabelText('Hora') as HTMLInputElement).value).toBe('10:00')
    expect((screen.getByLabelText('Hasta (opcional)') as HTMLInputElement).value).toBe('12:00')
    expect(screen.getByRole('button', { name: 'Cultura' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Día 1 · 12 may' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Añadir al itinerario' })).toBeNull()
  })

  it('pide la lista de actividades del viaje para encontrar la que se edita', async () => {
    const fetchMock = simularBackend()
    renderizar()

    await esperarFormulario()

    const urls = fetchMock.mock.calls.map(([url]) => url)
    expect(urls.some((url) => new RegExp(`/viajes/${VIAJE_ID}/actividades$`).test(url))).toBe(true)
  })

  it('no deja guardar hasta que se cambia algo y vuelve a bloquearse si se deshace el cambio', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizar()

    await esperarFormulario()
    expect(botonGuardar()).toHaveProperty('disabled', true)
    await user.type(screen.getByLabelText('Nombre de la actividad'), ' y Foro')
    expect(botonGuardar()).toHaveProperty('disabled', false)
    await user.type(screen.getByLabelText('Nombre de la actividad'), '{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}')
    expect(botonGuardar()).toHaveProperty('disabled', true)
  })

  it('envía solo el campo que ha cambiado y avisa con la fecha de la actividad', async () => {
    const user = userEvent.setup()
    const onGuardada = vi.fn()
    const fetchMock = simularBackend()
    renderizar({ onGuardada })

    await user.type(await esperarFormulario(), ' y Foro')
    await user.click(botonGuardar())

    await waitFor(() => expect(onGuardada).toHaveBeenCalledWith('2027-05-12'))
    const [url, opciones] = llamadasPatch(fetchMock)[0]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/actividades/${ACTIVIDAD_ID}$`))
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(cuerpoDelPatch(fetchMock)).toEqual({ titulo: 'Visita al Coliseo y Foro' })
  })

  it('no vuelve a crear la actividad: solo hay una petición PATCH y ningún POST', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar()

    await user.type(await esperarFormulario(), '!')
    await user.click(botonGuardar())

    await waitFor(() => expect(llamadasPatch(fetchMock)).toHaveLength(1))
    expect(fetchMock.mock.calls.some(([, opciones]) => (opciones as RequestInit | undefined)?.method === 'POST')).toBe(false)
  })

  it('al cambiarla de día envía la fecha nueva y avisa con ella', async () => {
    const user = userEvent.setup()
    const onGuardada = vi.fn()
    const fetchMock = simularBackend()
    renderizar({ onGuardada })

    await esperarFormulario()
    await user.click(screen.getByRole('button', { name: 'Día 2 · 13 may' }))
    await user.click(botonGuardar())

    await waitFor(() => expect(onGuardada).toHaveBeenCalledWith('2027-05-13'))
    expect(cuerpoDelPatch(fetchMock)).toEqual({ fecha: '2027-05-13' })
  })

  it('al quitar la hora de inicio quita también la de fin', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar()

    await esperarFormulario()
    await user.clear(screen.getByLabelText('Hora'))
    await user.click(botonGuardar())

    await waitFor(() => expect(llamadasPatch(fetchMock)).toHaveLength(1))
    expect(cuerpoDelPatch(fetchMock)).toEqual({ hora_inicio: null, hora_fin: null })
  })

  it('al vaciar el lugar y quitar el tipo envía null en esos campos', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar()

    await esperarFormulario()
    await user.clear(screen.getByLabelText('Lugar / Dirección'))
    await user.click(screen.getByRole('button', { name: 'Cultura' }))
    await user.click(botonGuardar())

    await waitFor(() => expect(llamadasPatch(fetchMock)).toHaveLength(1))
    expect(cuerpoDelPatch(fetchMock)).toEqual({ ubicacion_nombre: null, categoria: null })
  })

  it('cambia la hora de fin y el tipo sin tocar lo demás', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar()

    await esperarFormulario()
    await user.clear(screen.getByLabelText('Hasta (opcional)'))
    await user.type(screen.getByLabelText('Hasta (opcional)'), '13:30')
    await user.click(screen.getByRole('button', { name: 'Comida' }))
    await user.click(botonGuardar())

    await waitFor(() => expect(llamadasPatch(fetchMock)).toHaveLength(1))
    expect(cuerpoDelPatch(fetchMock)).toEqual({ hora_fin: '13:30', categoria: 'comida' })
  })

  it('avisa y no deja guardar si la hora de fin queda antes de la de inicio', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizar()

    await esperarFormulario()
    await user.clear(screen.getByLabelText('Hasta (opcional)'))
    await user.type(screen.getByLabelText('Hasta (opcional)'), '09:00')

    expect((await screen.findByRole('alert')).textContent).toBe('La hora de fin no puede ser anterior a la de inicio')
    expect(botonGuardar()).toHaveProperty('disabled', true)
  })

  it('no deja guardar si se borra el título', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizar()

    await esperarFormulario()
    await user.clear(screen.getByLabelText('Nombre de la actividad'))

    expect(botonGuardar()).toHaveProperty('disabled', true)
  })

  it('si la actividad está en un día fuera de las fechas del viaje, ese día aparece y está elegido', async () => {
    simularBackend({}, [actividad({ fecha: '2027-05-10' })])
    renderizar()

    await esperarFormulario()

    expect(screen.getByRole('button', { name: '10 may' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Día 1 · 12 may' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('en un viaje sin fechas muestra el campo de fecha con el día de la actividad', async () => {
    simularBackend({ fecha_inicio: null, fecha_fin: null })
    renderizar()

    await esperarFormulario()

    expect((screen.getByLabelText('Fecha') as HTMLInputElement).value).toBe('2027-05-12')
  })

  it('muestra el error del servidor, sigue en el formulario y deja volver a intentarlo', async () => {
    const user = userEvent.setup()
    const onGuardada = vi.fn()
    simularBackend({}, [actividad()], () =>
      respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' } }),
    )
    renderizar({ onGuardada })

    await user.type(await esperarFormulario(), '!')
    await user.click(botonGuardar())

    expect((await screen.findByRole('alert')).textContent).toBe('El viaje está cerrado y ya no se puede modificar')
    expect(onGuardada).not.toHaveBeenCalled()
    expect(botonGuardar()).toHaveProperty('disabled', false)
  })

  it('avisa si la actividad no existe en el viaje y no ofrece el formulario', async () => {
    simularBackend({}, [])
    renderizar()

    expect((await screen.findByRole('alert')).textContent).toContain('La actividad no existe en este viaje')
    expect(screen.queryByLabelText('Nombre de la actividad')).toBeNull()
  })

  it('en un viaje archivado avisa de que ya no se pueden modificar actividades', async () => {
    simularBackend({ estado: 'archivado' })
    renderizar()

    expect((await screen.findByRole('alert')).textContent).toBe(
      'El viaje está cerrado y ya no se pueden modificar actividades',
    )
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull()
  })

  it('avisa si no se ha podido cargar el viaje', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respuesta(404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } })),
    )
    renderizar()

    expect((await screen.findByRole('alert')).textContent).toContain('El viaje no existe o no perteneces a él')
  })

  it('la flecha de volver avisa a la ruta', async () => {
    const user = userEvent.setup()
    const onVolver = vi.fn()
    simularBackend()
    renderizar({ onVolver })

    await esperarFormulario()
    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(onVolver).toHaveBeenCalledTimes(1)
  })

  it('el selector de tipo conserva sus cinco opciones en modo edición', async () => {
    simularBackend()
    renderizar()

    await esperarFormulario()
    const tipos = screen.getByRole('group', { name: 'Tipo (opcional)' })

    expect(within(tipos).getAllByRole('button')).toHaveLength(5)
  })
})
