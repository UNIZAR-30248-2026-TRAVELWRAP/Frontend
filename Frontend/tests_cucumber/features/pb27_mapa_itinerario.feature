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

  Escenario: Las actividades sin ubicación elegida no tienen marcador
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Cena" el "2027-05-12" a las "21:00"
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo 1 marcadores en el mapa
    Y veo el texto "1 de 2 actividades con ubicación en el mapa"

  Escenario: Al elegir otro día el mapa muestra los marcadores de ese día
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Vaticano" el "2027-05-13" con ubicación "Ciudad del Vaticano" en las coordenadas 41.9022 y 12.4539
    Cuando abro el itinerario del viaje "Roma 2027"
    Y elijo el día "Día 2 · 13 may"
    Entonces veo 1 marcadores en el mapa
    Y veo el marcador "1. Vaticano"

  Escenario: Un día sin ubicaciones sigue mostrando el mapa y lo explica
    Dado que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" a las "10:00"
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo el mapa de las actividades del día
    Y veo 0 marcadores en el mapa
    Y veo el texto "Ninguna actividad de este día tiene ubicación en el mapa"

  Escenario: Un día sin actividades también muestra el mapa
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Cuando abro el itinerario del viaje "Roma 2027"
    Y elijo el día "Día 3 · 14 may"
    Entonces veo el texto "No hay actividades este día."
    Y veo el mapa de las actividades del día
    Y veo 0 marcadores en el mapa

  Escenario: Un viaje archivado también muestra el mapa
    Dado que tengo el viaje archivado "Lisboa 2026"
    Y que el servidor devuelve en "Lisboa 2026" la actividad "Tranvía 28" el "2027-05-12" con ubicación "Alfama, Lisboa" en las coordenadas 38.711 y -9.130
    Cuando abro el itinerario del viaje "Lisboa 2026"
    Entonces veo 1 marcadores en el mapa
    Y no veo el botón "Añadir Actividad"

  Escenario: El mapa se puede ampliar a casi toda la pantalla y reducir
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Cuando abro el itinerario del viaje "Roma 2027"
    Y pulso el botón "Ampliar mapa"
    Entonces veo el botón "Reducir mapa"
    Y el mapa ocupa casi toda la pantalla
    Y veo 2 marcadores en el mapa
    Cuando pulso el botón "Reducir mapa"
    Entonces veo el botón "Ampliar mapa"
    Y el mapa vuelve a su tamaño normal

  Escenario: Con Escape se reduce el mapa ampliado
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Cuando abro el itinerario del viaje "Roma 2027"
    Y pulso el botón "Ampliar mapa"
    Y pulso la tecla Escape
    Entonces veo el botón "Ampliar mapa"
    Y el mapa vuelve a su tamaño normal
