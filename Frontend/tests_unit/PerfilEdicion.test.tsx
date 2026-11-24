import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Perfil from '../src/screens/Perfil'
import { ApiError, type Usuario } from '../src/services/authApi'
import { actualizarNombre, quitarAvatar, subirAvatar } from '../src/services/perfilApi'

vi.mock('../src/services/perfilApi', () => ({
  actualizarNombre: vi.fn(),
  subirAvatar: vi.fn(),
  quitarAvatar: vi.fn(),
}))

// No hay canvas en jsdom: la foto se sube tal cual
vi.mock('../src/utils/avatar', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../src/utils/avatar')>()),
  prepararAvatar: vi.fn(async (archivo: File) => archivo),
}))

const FOTO = 'https://proyecto.supabase.co/storage/v1/object/public/avatares/u1/a.jpg'
const FOTO_NUEVA = 'https://proyecto.supabase.co/storage/v1/object/public/avatares/u1/b.png'

const usuario = (cambios: Partial<Usuario> = {}): Usuario => ({
  id: 'u1',
  nombre: 'Daniel Blasco',
  email: 'daniel@travelwrap.app',
  avatar_url: null,
  creado_en: '2026-01-01T00:00:00Z',
  ...cambios,
})

// Guarda el usuario como hace la app, para ver el resultado en pantalla
function PerfilConSesion({ inicial = usuario() }: { inicial?: Usuario }) {
  const [actual, setActual] = useState(inicial)
  return (
    <Perfil
      nombre={actual.nombre ?? ''}
      email={actual.email}
      avatarUrl={actual.avatar_url}
      token="token-1"
      onPerfilActualizado={setActual}
    />
  )
}

const png = () => new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' })
const selector = () => screen.getByLabelText('Elegir foto de perfil') as HTMLInputElement
const imagenDelAvatar = () => document.querySelector('img')

beforeEach(() => {
  vi.mocked(actualizarNombre).mockReset()
  vi.mocked(subirAvatar).mockReset()
  vi.mocked(quitarAvatar).mockReset()
})

afterEach(() => {
  cleanup()
})

describe('Perfil · foto', () => {
  it('muestra el botón de cambiar la foto con su camarita', () => {
    render(<PerfilConSesion />)

    expect(screen.getByRole('button', { name: 'Cambiar foto de perfil' })).toBeTruthy()
  })

  it('sin foto, tocar el avatar abre el selector de archivos y no la hoja', async () => {
    const user = userEvent.setup()
    render(<PerfilConSesion />)
    const abrir = vi.spyOn(selector(), 'click')

    await user.click(screen.getByRole('button', { name: 'Cambiar foto de perfil' }))

    expect(abrir).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })


  it('al elegir una foto la sube con el token y la muestra', async () => {
    const user = userEvent.setup()
    vi.mocked(subirAvatar).mockResolvedValue(usuario({ avatar_url: FOTO_NUEVA }))
    render(<PerfilConSesion />)
    const archivo = png()

    await user.upload(selector(), archivo)

    await waitFor(() => expect(imagenDelAvatar()?.getAttribute('src')).toBe(FOTO_NUEVA))
    expect(subirAvatar).toHaveBeenCalledWith(archivo, 'token-1')
    expect(selector().value).toBe('')
  })

  it('mientras se sube muestra «Subiendo…» y desactiva el botón', async () => {
    const user = userEvent.setup()
    let terminar: (u: Usuario) => void = () => undefined
    vi.mocked(subirAvatar).mockReturnValue(new Promise((resolver) => (terminar = resolver)))
    render(<PerfilConSesion />)

    await user.upload(selector(), png())

    expect((await screen.findByRole('status')).textContent).toBe('Subiendo…')
    expect((screen.getByRole('button', { name: 'Cambiar foto de perfil' }) as HTMLButtonElement).disabled).toBe(true)
    terminar(usuario({ avatar_url: FOTO_NUEVA }))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  })

  it('un tipo no válido muestra un error y no llama a la API', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<PerfilConSesion />)

    await user.upload(selector(), new File(['x'], 'nota.gif', { type: 'image/gif' }))

    expect((await screen.findByRole('alert')).textContent).toBe('La foto debe ser JPEG o PNG')
    expect(subirAvatar).not.toHaveBeenCalled()
  })


  it('con foto, tocar el avatar abre la hoja con las tres opciones', async () => {
    const user = userEvent.setup()
    render(<PerfilConSesion inicial={usuario({ avatar_url: FOTO })} />)

    await user.click(screen.getByRole('button', { name: 'Cambiar foto de perfil' }))

    const hoja = screen.getByRole('dialog', { name: 'Foto de perfil' })
    expect(hoja.querySelectorAll('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Cambiar foto' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quitar foto' })).toBeTruthy()
  })

  it('«Cancelar» cierra la hoja sin cambiar nada', async () => {
    const user = userEvent.setup()
    render(<PerfilConSesion inicial={usuario({ avatar_url: FOTO })} />)
    await user.click(screen.getByRole('button', { name: 'Cambiar foto de perfil' }))

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(quitarAvatar).not.toHaveBeenCalled()
  })


  it('quitar la foto pide confirmación antes de llamar a la API', async () => {
    const user = userEvent.setup()
    render(<PerfilConSesion inicial={usuario({ avatar_url: FOTO })} />)
    await user.click(screen.getByRole('button', { name: 'Cambiar foto de perfil' }))

    await user.click(screen.getByRole('button', { name: 'Quitar foto' }))

    const confirmacion = screen.getByRole('dialog')
    expect(confirmacion.textContent).toContain('¿Quitar tu foto de perfil?')
    expect(quitarAvatar).not.toHaveBeenCalled()
  })

  it('cancelar la confirmación no quita la foto', async () => {
    const user = userEvent.setup()
    render(<PerfilConSesion inicial={usuario({ avatar_url: FOTO })} />)
    await user.click(screen.getByRole('button', { name: 'Cambiar foto de perfil' }))
    await user.click(screen.getByRole('button', { name: 'Quitar foto' }))

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(quitarAvatar).not.toHaveBeenCalled()
    expect(imagenDelAvatar()?.getAttribute('src')).toBe(FOTO)
  })

  it('confirmar quita la foto y vuelve a verse la inicial', async () => {
    const user = userEvent.setup()
    vi.mocked(quitarAvatar).mockResolvedValue(usuario())
    render(<PerfilConSesion inicial={usuario({ avatar_url: FOTO })} />)
    await user.click(screen.getByRole('button', { name: 'Cambiar foto de perfil' }))
    await user.click(screen.getByRole('button', { name: 'Quitar foto' }))

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Quitar foto' }))

    await waitFor(() => expect(imagenDelAvatar()).toBeNull())
    expect(quitarAvatar).toHaveBeenCalledWith('token-1')
    expect(screen.getByText('D')).toBeTruthy()
  })

})

describe('Perfil · nombre', () => {
  const abrirEdicion = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: 'Editar nombre' }))
  const campo = () => screen.getByRole('textbox', { name: 'Nombre' }) as HTMLInputElement
  const guardar = () => screen.getByRole('button', { name: /^(Guardar|Guardando…)$/ }) as HTMLButtonElement

  it('el lápiz abre el campo con el nombre actual, limitado a 100 caracteres', async () => {
    const user = userEvent.setup()
    render(<PerfilConSesion />)

    await abrirEdicion(user)

    expect(campo().value).toBe('Daniel Blasco')
    expect(campo().maxLength).toBe(100)
  })



  it('un nombre vacío no se puede guardar y avisa', async () => {
    const user = userEvent.setup()
    render(<PerfilConSesion />)
    await abrirEdicion(user)

    await user.clear(campo())
    await user.type(campo(), '   ')

    expect(screen.getByRole('alert').textContent).toBe('Escribe tu nombre')
    expect(guardar().disabled).toBe(true)
    await user.type(campo(), '{Enter}')
    expect(actualizarNombre).not.toHaveBeenCalled()
  })





})
