# language: es
Característica: Lista de tareas colaborativa (PB-41)
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

  Escenario: Marca y desmarca una tarea y se actualiza el progreso
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" está la tarea "Reservar la cena" para "Berta"
    Y que en el viaje "Roma 2027" está la tarea "Comprar entradas" para "Adriana"
    Cuando abro la lista de tareas del viaje "Roma 2027"
    Entonces veo el texto "0/2"
    Y veo el texto "2 tareas pendientes"
    Cuando marco la tarea "Reservar la cena"
    Entonces la tarea "Reservar la cena" está marcada
    Y veo el texto "1/2"
    Y veo el texto "50% completado"
    Y el servidor tiene 1 tarea hecha
    Cuando marco la tarea "Reservar la cena"
    Entonces la tarea "Reservar la cena" está pendiente
    Y el servidor tiene 0 tareas hechas

  Escenario: Edita el texto y el responsable de una tarea
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" está la tarea "Reservar la cena" para "Berta"
    Cuando abro la lista de tareas del viaje "Roma 2027"
    Y edito la tarea "Reservar la cena" con el texto "Reservar el almuerzo" y el responsable "Adriana"
    Entonces veo el texto "Tarea actualizada"
    Y veo la tarea "Reservar el almuerzo"
    Y no veo la tarea "Reservar la cena"
    Y la tarea "Reservar el almuerzo" tiene a "Adriana" como responsable
    Y el servidor tiene la tarea "Reservar el almuerzo" para "Adriana"

  Escenario: Elimina una tarea tras confirmarlo
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" está la tarea "Reservar la cena" para "Berta"
    Cuando abro la lista de tareas del viaje "Roma 2027"
    Y pulso eliminar la tarea "Reservar la cena"
    Entonces veo el diálogo de confirmación "¿Eliminar esta tarea?"
    Cuando confirmo en el diálogo "Eliminar tarea"
    Entonces no veo la tarea "Reservar la cena"
    Y el servidor tiene 0 tareas

  Escenario: Cancelar la confirmación mantiene la tarea
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" está la tarea "Reservar la cena" para "Berta"
    Cuando abro la lista de tareas del viaje "Roma 2027"
    Y pulso eliminar la tarea "Reservar la cena"
    Y confirmo en el diálogo "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y veo la tarea "Reservar la cena"
    Y el servidor tiene 1 tarea

  Escenario: En un viaje finalizado la lista es de solo lectura
    Dado que soy miembro, pero no creador, del viaje finalizado "Roma 2027"
    Y que en el viaje "Roma 2027" está la tarea hecha "Comprar entradas" para "Adriana"
    Cuando abro la lista de tareas del viaje "Roma 2027"
    Entonces veo la tarea "Comprar entradas"
    Y no veo el botón "Nueva"
    Y no veo ningún botón de "Editar"
    Y no veo ningún botón de "Eliminar"
    Y la casilla de la tarea "Comprar entradas" está desactivada

  Escenario: El inicio del viaje cuenta las tareas pendientes propias y lleva a la lista
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" está la tarea "Comprar entradas" para "Adriana"
    Y que en el viaje "Roma 2027" está la tarea "Reservar la cena" para "Berta"
    Cuando abro el inicio del viaje "Roma 2027" con sus tareas
    Entonces veo el texto "1 tarea por completar"
    Cuando toco la tarjeta de tareas pendientes
    Entonces veo la lista de tareas del viaje

  Escenario: Sin tareas pendientes propias el inicio del viaje no muestra la tarjeta
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" está la tarea "Reservar la cena" para "Berta"
    Y que en el viaje "Roma 2027" está la tarea hecha "Comprar entradas" para "Adriana"
    Cuando abro el inicio del viaje "Roma 2027" con sus tareas
    Entonces no veo la tarjeta de tareas pendientes
