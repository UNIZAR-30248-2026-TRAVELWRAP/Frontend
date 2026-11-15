import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ListaTareas from '../src/components/ListaTareas'
import { ApiError } from '../src/services/authApi'
import { borrarTarea, crearTarea, editarTarea, listarTareas, type Tarea } from '../src/services/tareasApi'
import type { ViajeDelUsuario } from '../src/services/viajesApi'

vi.mock('../src/services/tareasApi', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../src/services/tareasApi')>()),
  listarTareas: vi.fn(),
  crearTarea: vi.fn(),
  editarTarea: vi.fn(),
  borrarTarea: vi.fn(),
}))

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'

const viajeActivo = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  estado: 'activo',
  miembros: [
    { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
} as unknown as ViajeDelUsuario
const viajeFinalizado = { ...viajeActivo, estado: 'finalizado' } as ViajeDelUsuario

const tarea = (cambios: Partial<Tarea> = {}): Tarea => ({
  id: 't1',
  texto: 'Reservar la cena',
  hecha: false,
  hecha_en: null,
  creado_en: '2027-05-01T10:00:00Z',
  responsable: { usuario_id: BERTA, nombre: 'Berta', avatar_url: null },
  ...cambios,
})

const CENA = tarea()
const TICKETS = tarea({ id: 't2', texto: 'Comprar entradas', hecha: true, hecha_en: '2027-05-02T09:00:00Z', responsable: { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null } })

const montar = async (viaje = viajeActivo, lista: Tarea[] = [CENA, TICKETS]) => {
  vi.mocked(listarTareas).mockResolvedValue({ tareas: lista })
  render(<ListaTareas viajeId={VIAJE_ID} tokenSesion="token-1" viaje={viaje} usuarioId={ADRIANA} />)
  await waitFor(() => expect(screen.queryByText('Cargando tareas...')).toBeNull())
}

const casilla = (texto: string) => screen.getByRole('checkbox', { name: `Marcar ${texto} como hecha` })

beforeEach(() => {
  vi.mocked(listarTareas).mockReset()
  vi.mocked(crearTarea).mockReset()
  vi.mocked(editarTarea).mockReset()
  vi.mocked(borrarTarea).mockReset()
})

afterEach(() => cleanup())

describe('ListaTareas: lista y progreso', () => {
  it('muestra «Cargando tareas...» y después cada tarea con su responsable y su casilla', async () => {
    vi.mocked(listarTareas).mockResolvedValue({ tareas: [CENA, TICKETS] })
    render(<ListaTareas viajeId={VIAJE_ID} tokenSesion="token-1" viaje={viajeActivo} usuarioId={ADRIANA} />)
    expect(screen.getByText('Cargando tareas...')).toBeTruthy()

    const lista = await screen.findByRole('list', { name: 'Tareas del viaje' })
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2)
    expect(casilla('Reservar la cena').getAttribute('aria-checked')).toBe('false')
    expect(casilla('Comprar entradas').getAttribute('aria-checked')).toBe('true')
    expect(within(lista).getByRole('img', { name: 'Responsable: Berta' })).toBeTruthy()
    expect(within(lista).getByRole('img', { name: 'Responsable: Adriana' })).toBeTruthy()
    expect(listarTareas).toHaveBeenCalledWith(VIAJE_ID, 'token-1')
  })

  it('la tarjeta de progreso indica hechas/total, pendientes y porcentaje', async () => {
    await montar()
    expect(screen.getByText('1/2')).toBeTruthy()
    expect(screen.getByText('1 tarea pendiente')).toBeTruthy()
    expect(screen.getByText('50% completado')).toBeTruthy()
  })

  it('con todas hechas dice «¡Todo listo!»', async () => {
    await montar(viajeActivo, [TICKETS])
    expect(screen.getByText('¡Todo listo!')).toBeTruthy()
    expect(screen.getByText('100% completado')).toBeTruthy()
  })

  it('sin tareas muestra el estado vacío y el botón «Nueva»', async () => {
    await montar(viajeActivo, [])
    expect(screen.getByText('Aún no hay tareas.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Nueva' })).toBeTruthy()
  })

  it('si falla la carga muestra el error y «Reintentar» vuelve a pedirlas', async () => {
    vi.mocked(listarTareas).mockRejectedValueOnce(new ApiError(502, 'error_tarea', 'No se han podido obtener las tareas'))
    vi.mocked(listarTareas).mockResolvedValueOnce({ tareas: [CENA] })
    render(<ListaTareas viajeId={VIAJE_ID} tokenSesion="token-1" viaje={viajeActivo} usuarioId={ADRIANA} />)

    expect((await screen.findByRole('alert')).textContent).toContain('No se han podido cargar las tareas')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('checkbox', { name: 'Marcar Reservar la cena como hecha' })).toBeTruthy()
    expect(listarTareas).toHaveBeenCalledTimes(2)
  })
})

describe('ListaTareas: marcar y desmarcar', () => {
  it('marca una tarea con hecha: true y actualiza el progreso', async () => {
    vi.mocked(editarTarea).mockResolvedValue({ ...CENA, hecha: true, hecha_en: '2027-05-03T09:00:00Z' })
    await montar()

    await userEvent.setup().click(casilla('Reservar la cena'))

    await waitFor(() => expect(casilla('Reservar la cena').getAttribute('aria-checked')).toBe('true'))
    expect(editarTarea).toHaveBeenCalledWith(VIAJE_ID, 't1', { hecha: true }, 'token-1')
    expect(screen.getByText('¡Todo listo!')).toBeTruthy()
  })

  it('desmarca una tarea hecha con hecha: false', async () => {
    vi.mocked(editarTarea).mockResolvedValue({ ...TICKETS, hecha: false, hecha_en: null })
    await montar()

    await userEvent.setup().click(casilla('Comprar entradas'))

    await waitFor(() => expect(casilla('Comprar entradas').getAttribute('aria-checked')).toBe('false'))
    expect(editarTarea).toHaveBeenCalledWith(VIAJE_ID, 't2', { hecha: false }, 'token-1')
    expect(screen.getByText('0/2')).toBeTruthy()
  })

  it('si falla, la tarea se queda como estaba y se muestra el error', async () => {
    vi.mocked(editarTarea).mockRejectedValue(new ApiError(502, 'error_tarea', 'Fallo'))
    await montar()

    await userEvent.setup().click(casilla('Reservar la cena'))

    expect((await screen.findByRole('alert')).textContent).toContain('No se ha podido marcar la tarea')
    expect(casilla('Reservar la cena').getAttribute('aria-checked')).toBe('false')
  })
})

describe('ListaTareas: crear', () => {
  it('«Añadir» está desactivado sin texto y crea la tarea con el usuario como responsable por defecto', async () => {
    vi.mocked(crearTarea).mockResolvedValue(tarea({ id: 't3', texto: 'Llevar el cargador', responsable: { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null } }))
    const usuario = userEvent.setup()
    await montar()

    await usuario.click(screen.getByRole('button', { name: 'Nueva' }))
    expect((screen.getByRole('button', { name: 'Añadir' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('Responsable') as HTMLSelectElement).value).toBe(ADRIANA)

    await usuario.type(screen.getByLabelText('Tarea'), '  Llevar el cargador ')
    await usuario.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(crearTarea).toHaveBeenCalledWith(VIAJE_ID, { texto: 'Llevar el cargador', responsable_id: ADRIANA }, 'token-1'))
    expect(await screen.findByRole('checkbox', { name: 'Marcar Llevar el cargador como hecha' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Llevar el cargador')
    expect(screen.queryByLabelText('Tarea')).toBeNull()
  })

  it('permite elegir como responsable a otro miembro', async () => {
    vi.mocked(crearTarea).mockResolvedValue(tarea({ id: 't3', texto: 'Alquilar coche' }))
    const usuario = userEvent.setup()
    await montar()

    await usuario.click(screen.getByRole('button', { name: 'Nueva' }))
    await usuario.type(screen.getByLabelText('Tarea'), 'Alquilar coche')
    await usuario.selectOptions(screen.getByLabelText('Responsable'), BERTA)
    await usuario.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(crearTarea).toHaveBeenCalledWith(VIAJE_ID, { texto: 'Alquilar coche', responsable_id: BERTA }, 'token-1'))
  })

  it('si falla muestra el error en el formulario y conserva lo escrito', async () => {
    vi.mocked(crearTarea).mockRejectedValue(new ApiError(409, 'viaje_no_activo', 'El viaje está finalizado'))
    const usuario = userEvent.setup()
    await montar()

    await usuario.click(screen.getByRole('button', { name: 'Nueva' }))
    await usuario.type(screen.getByLabelText('Tarea'), 'Algo')
    await usuario.click(screen.getByRole('button', { name: 'Añadir' }))

    expect((await screen.findByRole('alert')).textContent).toContain('El viaje ya no está activo')
    expect((screen.getByLabelText('Tarea') as HTMLInputElement).value).toBe('Algo')
  })

  it('«Cancelar» cierra el formulario sin crear nada', async () => {
    const usuario = userEvent.setup()
    await montar()

    await usuario.click(screen.getByRole('button', { name: 'Nueva' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText('Tarea')).toBeNull()
    expect(crearTarea).not.toHaveBeenCalled()
  })
})

describe('ListaTareas: editar', () => {
  it('abre el formulario con el texto y el responsable de la tarea y guarda los cambios', async () => {
    vi.mocked(editarTarea).mockResolvedValue({ ...CENA, texto: 'Reservar el almuerzo', responsable: { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null } })
    const usuario = userEvent.setup()
    await montar()

    await usuario.click(screen.getByRole('button', { name: 'Editar Reservar la cena' }))
    const campo = screen.getByLabelText('Tarea') as HTMLInputElement
    expect(campo.value).toBe('Reservar la cena')
    expect((screen.getByLabelText('Responsable') as HTMLSelectElement).value).toBe(BERTA)

    await usuario.clear(campo)
    await usuario.type(campo, 'Reservar el almuerzo')
    await usuario.selectOptions(screen.getByLabelText('Responsable'), ADRIANA)
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(editarTarea).toHaveBeenCalledWith(VIAJE_ID, 't1', { texto: 'Reservar el almuerzo', responsable_id: ADRIANA }, 'token-1'),
    )
    expect(await screen.findByRole('checkbox', { name: 'Marcar Reservar el almuerzo como hecha' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Tarea actualizada')
  })

  it('«Cancelar» deja la tarea como estaba', async () => {
    const usuario = userEvent.setup()
    await montar()

    await usuario.click(screen.getByRole('button', { name: 'Editar Reservar la cena' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(editarTarea).not.toHaveBeenCalled()
    expect(casilla('Reservar la cena')).toBeTruthy()
  })
})

describe('ListaTareas: eliminar', () => {
  it('pide confirmación, no borra al cancelar y borra al confirmar', async () => {
    vi.mocked(borrarTarea).mockResolvedValue(null)
    const usuario = userEvent.setup()
    await montar()

    await usuario.click(screen.getByRole('button', { name: 'Eliminar Reservar la cena' }))
    let dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByText('¿Eliminar esta tarea?')).toBeTruthy()
    expect(dialogo.textContent).toContain('se borrará para todos los miembros del viaje')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(borrarTarea).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Eliminar Reservar la cena' }))
    dialogo = screen.getByRole('dialog')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar tarea' }))

    await waitFor(() => expect(borrarTarea).toHaveBeenCalledWith(VIAJE_ID, 't1', 'token-1'))
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Marcar Reservar la cena como hecha' })).toBeNull())
    expect(screen.getByRole('status').textContent).toBe('Tarea eliminada')
    expect(screen.getByText('1/1')).toBeTruthy()
  })

  it('si otro miembro ya la había borrado (404), se quita igualmente de la lista', async () => {
    vi.mocked(borrarTarea).mockRejectedValue(new ApiError(404, 'tarea_no_encontrada', 'No existe'))
    const usuario = userEvent.setup()
    await montar()

    await usuario.click(screen.getByRole('button', { name: 'Eliminar Reservar la cena' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar tarea' }))

    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Marcar Reservar la cena como hecha' })).toBeNull())
    expect(screen.getByRole('status').textContent).toContain('ya la había eliminado otro miembro')
  })

  it('si falla otro error, el diálogo sigue abierto con el mensaje y la tarea no se quita', async () => {
    vi.mocked(borrarTarea).mockRejectedValue(new ApiError(502, 'error_tarea', 'Fallo'))
    const usuario = userEvent.setup()
    await montar()

    await usuario.click(screen.getByRole('button', { name: 'Eliminar Reservar la cena' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar tarea' }))

    expect((await within(screen.getByRole('dialog')).findByRole('alert')).textContent).toContain('No se ha podido eliminar la tarea')
    expect(casilla('Reservar la cena')).toBeTruthy()
  })
})

describe('ListaTareas: viaje finalizado', () => {
  it('es de solo lectura: sin «Nueva», «Editar» ni «Eliminar», con las casillas desactivadas y el aviso', async () => {
    await montar(viajeFinalizado)

    expect(screen.queryByRole('button', { name: 'Nueva' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Editar / })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Eliminar / })).toBeNull()
    expect((casilla('Reservar la cena') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/El viaje está finalizado: se pueden consultar sus tareas/)).toBeTruthy()
  })
})
