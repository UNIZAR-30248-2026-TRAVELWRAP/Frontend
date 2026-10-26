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

  Escenario: Quitar la ubicación localizada deja el texto sin coordenadas
    Dado que el buscador de direcciones encuentra "Colosseo" en "Roma" en la latitud 41.890214 y la longitud 12.492231
    Cuando abro la pantalla para añadir una actividad al viaje "Roma 2027"
    Y relleno solo el título "Visita al Coliseo"
    Y busco la dirección "Colosseo"
    Y elijo el resultado "Colosseo"
    Y pulso el botón "Quitar"
    Entonces no veo la ubicación localizada en el mapa
    Y el campo del lugar contiene "Colosseo, Roma"
    Cuando pulso el botón "Añadir al itinerario"
    Entonces estoy en el itinerario del viaje
    Y el servidor ha guardado la actividad "Visita al Coliseo" en "Colosseo, Roma" sin coordenadas

  Escenario: La lupa no se activa con menos de tres caracteres
    Cuando abro la pantalla para añadir una actividad al viaje "Roma 2027"
    Y escribo el lugar "Ro"
    Entonces el botón de buscar dirección está desactivado

  Escenario: Si no hay resultados se avisa y se puede guardar el lugar como texto
    Dado que el buscador de direcciones no encuentra nada
    Cuando abro la pantalla para añadir una actividad al viaje "Roma 2027"
    Y relleno solo el título "Cena"
    Y busco la dirección "Trattoria sin nombre"
    Entonces veo el aviso de que no hay resultados
    Cuando pulso el botón "Añadir al itinerario"
    Entonces estoy en el itinerario del viaje
    Y el servidor ha guardado la actividad "Cena" en "Trattoria sin nombre" sin coordenadas

  Escenario: Si se busca demasiado rápido se muestra el aviso del servidor
    Dado que el buscador de direcciones responde "Espera un segundo entre una búsqueda y otra" con el código 429
    Cuando abro la pantalla para añadir una actividad al viaje "Roma 2027"
    Y busco la dirección "Colosseo"
    Entonces veo el mensaje de error "Espera un segundo entre una búsqueda y otra"
    Y sigo en la pantalla de añadir actividad

  Escenario: Si falla el servicio de direcciones se muestra el error
    Dado que el buscador de direcciones responde "No se ha podido buscar la dirección" con el código 502
    Cuando abro la pantalla para añadir una actividad al viaje "Roma 2027"
    Y busco la dirección "Colosseo"
    Entonces veo el mensaje de error "No se ha podido buscar la dirección"
    Y sigo en la pantalla de añadir actividad
