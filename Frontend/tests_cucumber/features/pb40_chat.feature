# language: es
Característica: Chat del grupo (PB-40)
  Como miembro de un viaje
  Quiero escribir y leer mensajes con el grupo
  Para coordinar el viaje sin salir de la app

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que soy miembro, pero no creador, del viaje activo "Roma 2027"

  Escenario: Enviar un mensaje
    Cuando abro el chat del viaje "Roma 2027"
    Y escribo "Hola al grupo" en el chat
    Y pulso el botón "Enviar"
    Entonces veo el texto "Hola al grupo"
    Y el servidor ha guardado el mensaje "Hola al grupo"

  Escenario: Ver el historial al abrir el chat
    Dado que en el chat del viaje "Roma 2027" hay un mensaje de "Berta" con el texto "¿A qué hora quedamos?"
    Cuando abro el chat del viaje "Roma 2027"
    Entonces veo el texto "¿A qué hora quedamos?"
