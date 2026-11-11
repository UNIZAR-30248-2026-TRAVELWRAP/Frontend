import { describe, expect, it } from 'vitest'
import { MAX_BYTES_FOTO, motivoParaNoSubirFoto, textoDeFotos, TIPOS_FOTO } from '../src/utils/galeria'

const archivo = (nombre: string, tipo: string, bytes = 10) => new File([new Uint8Array(bytes).fill(1)], nombre, { type: tipo })

describe('motivoParaNoSubirFoto', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('admite una foto %s', (tipo) => {
    expect(motivoParaNoSubirFoto(archivo('foto', tipo))).toBeNull()
  })

  it('admite exactamente 8 MB', () => {
    expect(MAX_BYTES_FOTO).toBe(8_000_000)
    expect(motivoParaNoSubirFoto(archivo('foto.jpg', 'image/jpeg', 8_000_000))).toBeNull()
  })

  it('rechaza más de 8 MB', () => {
    expect(motivoParaNoSubirFoto(archivo('foto.jpg', 'image/jpeg', 8_000_001))).toBe('La foto no puede ocupar más de 8 MB')
  })

  it('rechaza un archivo vacío', () => {
    expect(motivoParaNoSubirFoto(archivo('foto.jpg', 'image/jpeg', 0))).toBe('El archivo está vacío')
  })

  it.each(['application/pdf', 'text/plain', 'image/gif', 'image/svg+xml'])('rechaza el tipo %s', (tipo) => {
    expect(motivoParaNoSubirFoto(archivo('archivo', tipo))).toBe('Solo se pueden subir fotos JPEG, PNG o WebP')
  })

  it.each(['mono.jpg', 'MONO.JPEG', 'mono.png', 'mono.webp'])('sin tipo indicado por el móvil, mira la extensión de %s', (nombre) => {
    expect(motivoParaNoSubirFoto(archivo(nombre, ''))).toBeNull()
  })

  it.each(['notas.txt', 'billete.pdf', 'sin_extension'])('sin tipo y con la extensión de %s lo rechaza', (nombre) => {
    expect(motivoParaNoSubirFoto(archivo(nombre, ''))).toBe('Solo se pueden subir fotos JPEG, PNG o WebP')
  })

  it('los tipos admitidos son los mismos que acepta el servidor', () => {
    expect(TIPOS_FOTO).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})

describe('textoDeFotos', () => {
  it('usa el plural', () => {
    expect(textoDeFotos(6, 3)).toBe('6 fotos · 3 miembros')
    expect(textoDeFotos(0, 2)).toBe('0 fotos · 2 miembros')
  })

  it('usa el singular', () => {
    expect(textoDeFotos(1, 1)).toBe('1 foto · 1 miembro')
  })
})
