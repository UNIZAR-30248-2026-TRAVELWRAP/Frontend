export const MAX_PARADAS_GOOGLE_MAPS = 11

type Parada = { latitud: number; longitud: number }

export const urlDeGoogleMaps = (paradas: Parada[]) => {
  const coordenadas = paradas.slice(0, MAX_PARADAS_GOOGLE_MAPS).map((p) => `${p.latitud},${p.longitud}`)
  const origen = coordenadas[0]
  const destino = coordenadas[coordenadas.length - 1]
  const intermedias = coordenadas.slice(1, -1)
  const url = new URL("https://www.google.com/maps/dir/")
  url.searchParams.set("api", "1")
  url.searchParams.set("origin", origen)
  url.searchParams.set("destination", destino)
  if (intermedias.length > 0) url.searchParams.set("waypoints", intermedias.join("|"))
  url.searchParams.set("travelmode", "walking")
  return url.toString()
}
