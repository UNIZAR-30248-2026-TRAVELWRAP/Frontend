// Spotify incrusta una playlist con su URL de embed: el mismo enlace con /embed delante de /playlist.
// Devuelve null si el enlace no es el de una playlist de Spotify
export const urlEmbebida = (url: string): string | null => {
  const coincidencia = url.match(/^https:\/\/open\.spotify\.com\/playlist\/([A-Za-z0-9]+)$/)
  return coincidencia ? `https://open.spotify.com/embed/playlist/${coincidencia[1]}` : null
}
