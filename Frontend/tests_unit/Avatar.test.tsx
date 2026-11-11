import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Avatar from '../src/components/Avatar'
import { aMiembro } from '../src/utils/formatoViaje'

afterEach(() => {
  cleanup()
})

const FOTO = 'https://proyecto.supabase.co/storage/v1/object/public/avatares/u1/a.jpg'
const FOTO_NUEVA = 'https://proyecto.supabase.co/storage/v1/object/public/avatares/u1/b.jpg'
const miembro = { name: 'Daniel', initial: 'D', color: '#2B6CB0' }

describe('Avatar', () => {
  it('sin foto muestra la inicial', () => {
    const { container } = render(<Avatar member={miembro} />)

    expect(screen.getByText('D')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })

  it('con foto muestra la imagen, sin texto alternativo, y no la inicial', () => {
    const { container } = render(<Avatar member={{ ...miembro, imageUrl: FOTO }} />)

    const imagen = container.querySelector('img')!
    expect(imagen.getAttribute('src')).toBe(FOTO)
    expect(imagen.getAttribute('alt')).toBe('')
    expect(screen.queryByText('D')).toBeNull()
  })

  it('si la foto no carga, vuelve a la inicial', () => {
    const { container } = render(<Avatar member={{ ...miembro, imageUrl: FOTO }} />)

    fireEvent.error(container.querySelector('img')!)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('D')).toBeTruthy()
  })

  it('al cambiar la URL de la foto vuelve a intentarlo tras un fallo', () => {
    const { container, rerender } = render(<Avatar member={{ ...miembro, imageUrl: FOTO }} />)
    fireEvent.error(container.querySelector('img')!)

    rerender(<Avatar member={{ ...miembro, imageUrl: FOTO_NUEVA }} />)

    expect(container.querySelector('img')!.getAttribute('src')).toBe(FOTO_NUEVA)
  })

  it('con imageUrl en null muestra la inicial', () => {
    const { container } = render(<Avatar member={{ ...miembro, imageUrl: null }} />)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('D')).toBeTruthy()
  })
})

describe('aMiembro con foto', () => {
  it('incluye la foto del miembro', () => {
    expect(aMiembro('Daniel', 0, FOTO).imageUrl).toBe(FOTO)
  })

  it('sin foto, imageUrl es null', () => {
    expect(aMiembro('Daniel', 0).imageUrl).toBeNull()
    expect(aMiembro('Daniel', 0, null).imageUrl).toBeNull()
  })
})
