# language: es
Característica: Lista de tareas colaborativa (PB-41 y PB-63)
  Como miembro de un viaje
  Quiero una lista de tareas compartida con un responsable para cada una
  Para repartir lo que hay que hacer y ver cuánto llevamos

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Añade una tarea y le asigna un responsable del viaje
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Cuando abro la lista de tareas del viaje "Roma 2027"
    Entonces veo el texto "Aún no hay tareas."
    Cuando añado la tarea "Reservar la cena" para "Berta"
    Entonces veo la tarea "Reservar la cena"
    Y la tarea "Reservar la cena" tiene a "Berta" como responsable
    Y el servidor tiene la tarea "Reservar la cena" para "Berta"

  Escenario: El inicio del viaje cuenta las tareas pendientes propias y lleva a la lista (PB-63)
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" está la tarea "Comprar entradas" para "Adriana"
    Y que en el viaje "Roma 2027" está la tarea "Reservar la cena" para "Berta"
    Cuando abro el inicio del viaje "Roma 2027" con sus tareas
    Entonces veo el texto "1 tarea por completar"
    Cuando toco la tarjeta de tareas pendientes
    Entonces veo la lista de tareas del viaje
