# language: es
Característica: Votar y ver resultados en tiempo real (PB-19)
  Como miembro de un viaje
  Quiero votar las opciones de cada votación y ver los resultados al momento
  Para que el grupo decida sin tener que preguntar a cada uno

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que he creado el viaje "Roma 2027" con destino "Roma", en el que también está Berta
    Y que el viaje tiene la votación de fechas "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"

  Escenario: Votar una opción la marca como mi elección y actualiza el recuento
    Cuando entro en las votaciones del viaje
    Y voto "12 – 15 mayo" en la votación "¿Qué fin de semana salimos?"
    Entonces la opción "12 – 15 mayo" de "¿Qué fin de semana salimos?" aparece como «Tu elección»
    Y la opción "12 – 15 mayo" de "¿Qué fin de semana salimos?" tiene 1 voto (100 %)
    Y en "¿Qué fin de semana salimos?" han votado 1 de 2 miembros
    Y el servidor ha recibido 1 voto

  Escenario: Cambiar el voto mientras la votación sigue abierta
    Dado que Berta ya ha votado "19 – 22 mayo" en "¿Qué fin de semana salimos?"
    Y que ya he votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Cuando entro en las votaciones del viaje
    Y voto "19 – 22 mayo" en la votación "¿Qué fin de semana salimos?"
    Entonces la opción "19 – 22 mayo" de "¿Qué fin de semana salimos?" tiene 2 votos (100 %)
    Y la opción "12 – 15 mayo" de "¿Qué fin de semana salimos?" tiene 0 votos (0 %)
    Y la votación "¿Qué fin de semana salimos?" aparece como completa

  Escenario: Los votos y las propuestas de los demás aparecen sin recargar
    Cuando entro en las votaciones del viaje
    Y Berta vota "19 – 22 mayo" en "¿Qué fin de semana salimos?" desde su móvil
    Entonces la opción "19 – 22 mayo" de "¿Qué fin de semana salimos?" tiene 1 voto (100 %)
    Y en "¿Qué fin de semana salimos?" han votado 1 de 2 miembros
    Cuando Berta propone "26 – 29 mayo" en "¿Qué fin de semana salimos?" desde su móvil
    Entonces veo la opción "26 – 29 mayo" en "¿Qué fin de semana salimos?"

  Escenario: Si el voto falla se muestra el error y el recuento no cambia
    Dado que el servidor rechaza los votos porque la votación se acaba de cerrar
    Cuando entro en las votaciones del viaje
    Y voto "12 – 15 mayo" en la votación "¿Qué fin de semana salimos?"
    Entonces veo el mensaje de error "La votación ya está cerrada"
    Y la opción "12 – 15 mayo" de "¿Qué fin de semana salimos?" tiene 0 votos (0 %)
    Y en "¿Qué fin de semana salimos?" han votado 0 de 2 miembros

  Escenario: En un viaje finalizado se ven las votaciones pero no se puede votar
    Dado que el viaje está finalizado
    Cuando entro en las votaciones del viaje
    Entonces veo la votación "¿Qué fin de semana salimos?"
    Y no veo el botón "Emitir voto"

  Escenario: Filtrar las votaciones por tipo
    Dado que el viaje tiene la votación de actividades "¿Qué visitamos el primer día?" con las opciones "Coliseo" y "Vaticano"
    Cuando entro en las votaciones del viaje
    Y filtro las votaciones por "Actividades"
    Entonces veo la votación "¿Qué visitamos el primer día?"
    Y no veo la votación "¿Qué fin de semana salimos?"
    Cuando filtro las votaciones por "Fechas"
    Entonces veo la votación "¿Qué fin de semana salimos?"
    Y no veo la votación "¿Qué visitamos el primer día?"
