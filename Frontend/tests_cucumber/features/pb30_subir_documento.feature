# language: es
Característica: Subir un documento a la cartera del viaje (PB-30)
  Como miembro de un viaje
  Quiero subir billetes, reservas y otros documentos a la cartera del viaje
  Para que todo el grupo los tenga a mano

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Subir un PDF lo añade a «Documentos del viaje» con su nombre
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la cartera del viaje "Roma 2027" está el documento "Reserva del hotel.pdf"
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y subo el archivo "billete.pdf" de tipo "application/pdf"
    Entonces veo en la cartera de documentos, por este orden, "billete.pdf, Reserva del hotel.pdf"
    Y veo el texto "«billete.pdf» se ha añadido a la cartera"
    Y el servidor ha recibido 1 documento "billete.pdf"

  Escenario: Un archivo .txt no se puede subir y la lista no cambia
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la cartera del viaje "Roma 2027" está el documento "Reserva del hotel.pdf"
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y subo el archivo "notas.txt" de tipo "text/plain"
    Entonces veo el mensaje de error "Solo se pueden subir documentos PDF o imágenes JPEG o PNG"
    Y veo en la cartera de documentos, por este orden, "Reserva del hotel.pdf"
    Y el servidor ha recibido 0 documentos
