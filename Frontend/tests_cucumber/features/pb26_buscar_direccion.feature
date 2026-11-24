# language: es
Característica: Buscar la dirección de una actividad (PB-26)
  Como miembro de un viaje
  Quiero buscar la dirección de una actividad y elegir el lugar exacto
  Para que quede localizada con sus coordenadas

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850

  Escenario: Buscar una dirección, elegirla y guardar la actividad con sus coordenadas
    Dado que el buscador de direcciones encuentra "Colosseo" en "Roma" en la latitud 41.890214 y la longitud 12.492231
    Cuando abro la pantalla para añadir una actividad al viaje "Roma 2027"
    Y relleno solo el título "Visita al Coliseo"
    Y busco la dirección "Colosseo"
    Entonces el servidor de direcciones ha recibido la búsqueda "Colosseo"
    Y veo 1 resultados de búsqueda
    Y el resultado 1 muestra el título "Colosseo" y el detalle "Roma, Italia"
    Cuando elijo el resultado "Colosseo"
    Entonces veo la ubicación localizada en el mapa
    Y el campo del lugar contiene "Colosseo, Roma"
    Cuando pulso el botón "Añadir al itinerario"
    Entonces estoy en el itinerario del viaje
    Y el servidor ha guardado la actividad "Visita al Coliseo" en "Colosseo, Roma" con la latitud 41.890214 y la longitud 12.492231

  Escenario: La lupa no se activa con menos de tres caracteres
    Cuando abro la pantalla para añadir una actividad al viaje "Roma 2027"
    Y escribo el lugar "Ro"
    Entonces el botón de buscar dirección está desactivado
