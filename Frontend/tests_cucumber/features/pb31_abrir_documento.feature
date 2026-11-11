# language: es
Característica: Abrir y previsualizar un documento de la cartera (PB-31)
  Como miembro de un viaje
  Quiero abrir los documentos de la cartera sin salir de la aplicación
  Para consultar mis billetes y reservas desde el móvil

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Abrir un PDF muestra sus páginas dentro de la aplicación
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la cartera del viaje "Roma 2027" está el documento "Reserva del hotel.pdf"
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y abro el documento "Reserva del hotel.pdf"
    Entonces veo el texto "Página 1 de 1"
    Y la página 1 del documento está dibujada
    Y el servidor ha entregado un enlace para abrir el documento "Reserva del hotel.pdf"

  Escenario: Abrir una imagen la muestra ampliada y se puede cerrar
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la cartera del viaje "Roma 2027" está la imagen "Foto del hotel.png"
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y abro el documento "Foto del hotel.png"
    Entonces veo la imagen "Foto del hotel.png" ampliada
    Cuando cierro la vista previa del documento
    Entonces no veo la vista previa del documento

  Escenario: Un documento que ya no existe se avisa en la vista previa
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la cartera del viaje "Roma 2027" está el documento "Reserva del hotel.pdf"
    Y que el documento "Reserva del hotel.pdf" ya se ha eliminado del servidor
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y abro el documento "Reserva del hotel.pdf"
    Entonces veo el mensaje de error "Este documento ya no existe: es posible que lo hayan eliminado"

  Escenario: En un viaje archivado también se puede abrir un documento
    Dado que tengo el viaje archivado "Roma 2026"
    Y que en la cartera del viaje "Roma 2026" está la imagen "Foto del hotel.png"
    Cuando abro la cartera de documentos del viaje "Roma 2026"
    Y abro el documento "Foto del hotel.png"
    Entonces veo la imagen "Foto del hotel.png" ampliada
