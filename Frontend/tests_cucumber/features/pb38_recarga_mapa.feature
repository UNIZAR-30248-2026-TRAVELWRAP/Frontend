# language: es
Característica: La agenda y el mapa se recargan tras los cambios (PB-38)
  Como miembro de un viaje
  Quiero que la agenda y el mapa del itinerario se actualicen al añadir, editar o eliminar una actividad
  Para ver siempre el plan del día tal como está en el servidor

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850

  Escenario: Una actividad añadida con ubicación aparece en la agenda y como marcador
    Dado que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Y que el buscador de direcciones encuentra "Colosseo" en "Roma" en la latitud 41.890214 y la longitud 12.492231
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo 1 marcadores en el mapa
    Cuando pulso el botón "Añadir Actividad"
    Y relleno solo el título "Visita al Coliseo"
    Y busco la dirección "Colosseo"
    Y elijo el resultado "Colosseo"
    Y pulso el botón "Añadir al itinerario"
    Entonces estoy en el itinerario del viaje
    Y veo 2 marcadores en el mapa
    Y veo el texto "2 de 2 actividades con ubicación en el mapa"

  Escenario: Al quitar la ubicación de una actividad su marcador desaparece
    Dado que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo 1 marcadores en el mapa
    Cuando pulso editar la actividad "Foro Romano"
    Y pulso el botón "Quitar"
    Y pulso el botón "Guardar cambios"
    Entonces estoy en el itinerario del viaje
    Y veo 0 marcadores en el mapa
    Y veo el texto "Ninguna actividad de este día tiene ubicación en el mapa"

  Escenario: Al eliminar una actividad desaparece de la agenda y su marcador
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" con ubicación "Colosseo, Roma" en las coordenadas 41.890214 y 12.492231
    Y que el servidor devuelve en "Roma 2027" la actividad "Foro Romano" el "2027-05-12" con ubicación "Foro Romano, Roma" en las coordenadas 41.892462 y 12.485325
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo 2 marcadores en el mapa
    Cuando pulso eliminar la actividad "Visita al Coliseo"
    Y confirmo en el diálogo "Eliminar actividad"
    Entonces veo en la agenda, por este orden, "Foro Romano"
    Y veo 1 marcadores en el mapa
    Y veo el marcador "1. Foro Romano"
    Y veo el texto "1 de 1 actividad con ubicación en el mapa"
