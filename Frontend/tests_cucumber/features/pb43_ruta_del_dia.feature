# language: es
Característica: Ruta sugerida del día en el mapa (PB-43)
  Como miembro de un viaje
  Quiero ver una línea que una las actividades del día en el mapa
  Para saber en qué orden recorrerlas

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850

  Escenario: Las actividades con ubicación de un día se unen con una línea
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo 2 marcadores en el mapa
    Y veo una línea que une las actividades en el mapa

  Escenario: Con una sola actividad con ubicación no hay línea
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo 1 marcadores en el mapa
    Y no veo ninguna línea en el mapa

  Escenario: Al eliminar una actividad la línea desaparece
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo una línea que une las actividades en el mapa
    Cuando pulso eliminar la actividad "Visita al Coliseo"
    Y confirmo en el diálogo "Eliminar actividad"
    Entonces veo 1 marcadores en el mapa
    Y no veo ninguna línea en el mapa

  Escenario: La ruta por calles sustituye a la línea recta e indica distancia y duración
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Y que el servicio de rutas calcula un recorrido de 3420 metros y 2700 segundos
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo el texto "Ruta a pie por calles: 3,4 km · 45 min"
    Y veo la línea continua de la ruta por calles en el mapa
    Y el servicio de rutas ha recibido 1 petición

  Escenario: Si el servicio de rutas no responde se avisa y queda la línea recta
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Y que el servicio de rutas no responde
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo el texto "No se ha podido calcular la ruta por calles; se muestra una línea recta."
    Y veo la línea discontinua recta en el mapa

  Escenario: Se sugiere un orden más corto cuando ahorra distancia
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Y que el servicio de rutas sugiere el orden "a2,a1" y ahorra 1240 metros
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo el texto "Orden más corto: «Foro Romano» → «Visita al Coliseo»"

  Escenario: Con una sola actividad con ubicación no se pide ninguna ruta
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servicio de rutas calcula un recorrido de 3420 metros y 2700 segundos
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo 1 marcadores en el mapa
    Y el servicio de rutas ha recibido 0 petición

  Escenario: Al eliminar una de tres actividades se vuelve a calcular la ruta
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Y que el servidor devuelve en "Roma 2027" la actividad "Panteón" el "2027-05-12" con ubicación "Panteón, Roma" en las coordenadas 41.8986 y 12.4769
    Y que el servicio de rutas calcula un recorrido de 3420 metros y 2700 segundos
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo el texto "Ruta a pie por calles: 3,4 km · 45 min"
    Y el servicio de rutas ha recibido 1 petición
    Cuando pulso eliminar la actividad "Foro Romano"
    Y confirmo en el diálogo "Eliminar actividad"
    Entonces veo 2 marcadores en el mapa
    Y el servicio de rutas ha recibido 2 peticiones
