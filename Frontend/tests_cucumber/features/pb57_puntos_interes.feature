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

  Escenario: Tocar el mapa permite guardar un punto sin dirección
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Cuando abro los puntos de interés del viaje "Roma 2027"
    Y toco el mapa de los puntos de interés
    Entonces veo el panel del nuevo punto con "Sin dirección"
    Cuando escribo el nombre del punto "Mirador"
    Y escribo la nota del punto "Al atardecer"
    Y elijo el tipo de punto "Cultura"
    Y guardo el punto de interés
    Entonces veo la ficha del punto "Mirador"
    Y la ficha del punto "Mirador" muestra "Al atardecer"
    Y veo 1 puntos de interés en la lista
    Y el servidor ha recibido el punto "Mirador" sin dirección y de tipo "cultura"

  Escenario: Buscar una dirección guarda el punto con su dirección
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el buscador de direcciones encuentra "Pantheon" en "Roma" en la latitud 41.8986 y la longitud 12.4769
    Cuando abro los puntos de interés del viaje "Roma 2027"
    Y busco el sitio "Pantheon"
    Y elijo el resultado "Pantheon"
    Entonces veo el panel del nuevo punto con "Pantheon, Roma"
    Cuando guardo el punto de interés
    Entonces la ficha del punto "Pantheon" muestra "Pantheon, Roma"
    Y el servidor ha recibido el punto "Pantheon" con la dirección "Pantheon, Roma"

  Escenario: Cancelar no guarda nada
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Cuando abro los puntos de interés del viaje "Roma 2027"
    Y toco el mapa de los puntos de interés
    Y pulso el botón "Cancelar"
    Entonces no veo ninguna ficha
    Y el servidor no ha recibido ningún punto

  Escenario: Si el servidor rechaza el punto se avisa y se conserva lo escrito
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el servidor rechaza guardar puntos de interés
    Cuando abro los puntos de interés del viaje "Roma 2027"
    Y toco el mapa de los puntos de interés
    Y escribo el nombre del punto "Mirador"
    Y guardo el punto de interés
    Entonces veo el aviso "El nombre es obligatorio" en el panel del nuevo punto
    Y veo el panel del nuevo punto con "Sin dirección"

  Escenario: La ficha de un punto enseña su dirección, quién lo añadió y enlaza a Google Maps
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" hay el punto de interés "Fontana di Trevi" de tipo "cultura" añadido por "Berta" en la dirección "Piazza di Trevi, Roma"
    Cuando abro los puntos de interés del viaje "Roma 2027"
    Y abro el punto de interés "Fontana di Trevi"
    Entonces veo la ficha del punto "Fontana di Trevi"
    Y la ficha del punto "Fontana di Trevi" muestra "Piazza di Trevi, Roma"
    Y la ficha del punto "Fontana di Trevi" muestra "Añadido por Berta"
    Y la ficha del punto "Fontana di Trevi" enlaza a Google Maps con las coordenadas "41.893,12.474"
    Cuando cierro la ficha
    Entonces no veo ninguna ficha

  Escenario: Un punto sin dirección enseña sus coordenadas
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" hay el punto de interés "Mirador" de tipo "sin tipo" añadido por "Adriana"
    Cuando abro los puntos de interés del viaje "Roma 2027"
    Y abro el punto de interés "Mirador"
    Entonces la ficha del punto "Mirador" muestra "Sin dirección · 41,89300, 12,47400"

  Escenario: Se filtran los puntos por tipo y por quién los añadió
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" hay el punto de interés "Fontana di Trevi" de tipo "cultura" añadido por "Adriana"
    Y que en el viaje "Roma 2027" hay el punto de interés "Heladería Giolitti" de tipo "comida" añadido por "Berta"
    Y que en el viaje "Roma 2027" hay el punto de interés "Pizzería" de tipo "comida" añadido por "Adriana"
    Cuando abro los puntos de interés del viaje "Roma 2027"
    Y filtro los puntos por el tipo "Comida"
    Entonces veo el texto "Puntos de interés (2 de 3)"
    Y veo 2 puntos de interés en la lista
    Y veo 2 puntos de interés en el mapa
    Cuando filtro los puntos por los añadidos por "Berta"
    Entonces veo 1 puntos de interés en la lista

  Escenario: Se borra un punto desde su ficha tras confirmarlo
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" hay el punto de interés "Fontana di Trevi" de tipo "cultura" añadido por "Berta"
    Y que en el viaje "Roma 2027" hay el punto de interés "Heladería Giolitti" de tipo "comida" añadido por "Adriana"
    Cuando abro los puntos de interés del viaje "Roma 2027"
    Y abro el punto de interés "Fontana di Trevi"
    Y borro el punto desde su ficha
    Entonces veo el texto "¿Eliminar este punto de interés?"
    Cuando confirmo el borrado del punto
    Entonces veo 1 puntos de interés en la lista
    Y el servidor ha borrado 1 punto de interés

  Escenario: En un viaje archivado los puntos solo se ven
    Dado que soy miembro, pero no creador, del viaje archivado "Roma 2026"
    Y que en el viaje "Roma 2026" hay el punto de interés "Fontana di Trevi" de tipo "cultura" añadido por "Berta"
    Cuando abro los puntos de interés del viaje "Roma 2026"
    Entonces veo 1 puntos de interés en la lista
    Y veo el texto "Solo se pueden añadir puntos mientras el viaje está activo."
    Y no puedo buscar direcciones para los puntos
    Y no veo ningún botón para eliminar puntos
    Cuando toco el mapa de los puntos de interés
    Entonces no veo ninguna ficha
