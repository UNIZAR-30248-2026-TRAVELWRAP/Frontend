# language: es
Característica: Ruta sugerida del día en el mapa (PB-43 y PB-58)
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

  Escenario: Con dos ubicaciones se puede abrir la ruta en Google Maps (PB-58)
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces el enlace "Abrir en Google Maps" abre en una pestaña nueva la ruta a pie de "41.890214,12.492231" a "41.892462,12.485325"
