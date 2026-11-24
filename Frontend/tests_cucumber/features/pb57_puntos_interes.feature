# language: es
Característica: Mapa con puntos de interés (PB-57)
  Como miembro de un viaje
  Quiero tener en un mapa aparte los sitios que nos interesan, sin que sean una actividad
  Para que todo el grupo los vea y los pueda abrir cuando quiera

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Los puntos del viaje salen en el mapa y en la lista
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" hay el punto de interés "Fontana di Trevi" de tipo "cultura" añadido por "Adriana" en la dirección "Piazza di Trevi, Roma"
    Y que en el viaje "Roma 2027" hay el punto de interés "Heladería Giolitti" de tipo "comida" añadido por "Berta"
    Cuando abro los puntos de interés del viaje "Roma 2027"
    Entonces veo 2 puntos de interés en el mapa
    Y veo 2 puntos de interés en la lista
    Y veo el texto "Puntos de interés (2)"
    Y veo el texto "Piazza di Trevi, Roma"

  Escenario: Si el servidor rechaza el punto se avisa y se conserva lo escrito
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el servidor rechaza guardar puntos de interés
    Cuando abro los puntos de interés del viaje "Roma 2027"
    Y toco el mapa de los puntos de interés
    Y escribo el nombre del punto "Mirador"
    Y guardo el punto de interés
    Entonces veo el aviso "El nombre es obligatorio" en el panel del nuevo punto
    Y veo el panel del nuevo punto con "Sin dirección"
