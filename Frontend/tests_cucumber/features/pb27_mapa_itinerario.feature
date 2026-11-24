# language: es
Característica: Ver las actividades como marcadores en el mapa (PB-27)
  Como miembro de un viaje
  Quiero ver en un mapa las actividades del día que tienen ubicación
  Para saber dónde está cada plan y en qué orden recorrerlos

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850

  Escenario: Cada actividad del día con ubicación aparece como un marcador numerado
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo el mapa de las actividades del día
    Y veo 2 marcadores en el mapa
    Y veo el marcador "1. Visita al Coliseo"
    Y veo el marcador "2. Foro Romano"
    Y veo el texto "2 de 2 actividades con ubicación en el mapa"

  Escenario: Con Escape se reduce el mapa ampliado
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Cuando abro el itinerario del viaje "Roma 2027"
    Y pulso el botón "Ampliar mapa"
    Y pulso la tecla Escape
    Entonces veo el botón "Ampliar mapa"
    Y el mapa vuelve a su tamaño normal
