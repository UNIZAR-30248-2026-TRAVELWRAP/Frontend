import { describe, expect, it } from 'vitest'
import {
  archivoEsVideo,
  descripcionDeFoto,
  esVideo,
  MAX_BYTES_FOTO,
  MAX_BYTES_VIDEO,
  motivoParaNoSubirFoto,
  textoDeEspacio,
  textoDeFotos,
  TIPOS_FOTO,
  TIPOS_VIDEO,
} from '../src/utils/galeria'

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
    expect(motivoParaNoSubirFoto(archivo('archivo', tipo))).toBe('Solo se pueden subir fotos (JPEG, PNG o WebP) o vídeos (MP4, WebM o MOV)')
  })

  it.each(['mono.jpg', 'MONO.JPEG', 'mono.png', 'mono.webp'])('sin tipo indicado por el móvil, mira la extensión de %s', (nombre) => {
    expect(motivoParaNoSubirFoto(archivo(nombre, ''))).toBeNull()
  })

  it.each(['notas.txt', 'billete.pdf', 'sin_extension'])('sin tipo y con la extensión de %s lo rechaza', (nombre) => {
    expect(motivoParaNoSubirFoto(archivo(nombre, ''))).toBe('Solo se pueden subir fotos (JPEG, PNG o WebP) o vídeos (MP4, WebM o MOV)')
  })

  it('los tipos admitidos son los mismos que acepta el servidor', () => {
    expect(TIPOS_FOTO).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})

describe('vídeos', () => {
  it('los tipos de vídeo admitidos son MP4, WebM y MOV', () => {
    expect(TIPOS_VIDEO).toEqual(['video/mp4', 'video/webm', 'video/quicktime'])
    expect(TIPOS_VIDEO.every(esVideo)).toBe(true)
    expect(TIPOS_FOTO.some(esVideo)).toBe(false)
  })

  it.each(['video/mp4', 'video/webm', 'video/quicktime'])('admite un vídeo %s, aunque pase de 8 MB', (tipo) => {
    expect(motivoParaNoSubirFoto(archivo('clip', tipo, 20_000_000))).toBeNull()
  })

  it('admite exactamente 50 MB y rechaza más', () => {
    expect(MAX_BYTES_VIDEO).toBe(50_000_000)
    expect(motivoParaNoSubirFoto(archivo('clip.mp4', 'video/mp4', 50_000_000))).toBeNull()
    expect(motivoParaNoSubirFoto(archivo('clip.mp4', 'video/mp4', 50_000_001))).toBe('El vídeo no puede ocupar más de 50 MB')
  })


  it.each(['clip.mp4', 'CLIP.MOV', 'clip.webm'])('sin tipo indicado por el móvil, mira la extensión de %s', (nombre) => {
    expect(archivoEsVideo(archivo(nombre, ''))).toBe(true)
    expect(motivoParaNoSubirFoto(archivo(nombre, ''))).toBeNull()
  })

  it('una foto sigue sin poder pasar de 8 MB aunque los vídeos sí', () => {
    expect(archivoEsVideo(archivo('foto.jpg', 'image/jpeg'))).toBe(false)
    expect(motivoParaNoSubirFoto(archivo('foto.jpg', 'image/jpeg', 8_000_001))).toBe('La foto no puede ocupar más de 8 MB')
  })
})

describe('textoDeEspacio', () => {
  it('indica lo usado y el límite en MB, con coma decimal', () => {
    expect(textoDeEspacio(3_400_000, 200_000_000)).toBe('3,4 MB de 200 MB usados')
    expect(textoDeEspacio(0, 200_000_000)).toBe('0 MB de 200 MB usados')
  })

  it('avisa cuando el almacenamiento está lleno', () => {
    expect(textoDeEspacio(200_000_000, 200_000_000)).toBe('Almacenamiento lleno: 200 MB de 200 MB')
    expect(textoDeEspacio(210_000_000, 200_000_000)).toBe('Almacenamiento lleno: 200 MB de 200 MB')
  })
})

describe('textoDeFotos', () => {
  it('cuenta aparte los vídeos', () => {
    expect(textoDeFotos(3, 2, 1)).toBe('3 fotos · 1 vídeo · 2 miembros')
    expect(textoDeFotos(1, 1, 4)).toBe('1 foto · 4 vídeos · 1 miembro')
    expect(textoDeFotos(0, 2, 2)).toBe('0 fotos · 2 vídeos · 2 miembros')
  })

  it('usa el plural', () => {
    expect(textoDeFotos(6, 3)).toBe('6 fotos · 3 miembros')
    expect(textoDeFotos(0, 2)).toBe('0 fotos · 2 miembros')
  })

})

