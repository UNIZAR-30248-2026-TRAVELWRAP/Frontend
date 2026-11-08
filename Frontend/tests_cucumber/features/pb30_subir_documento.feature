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

  Escenario: Si el servidor rechaza el archivo, se muestra su error y la lista no cambia
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el servidor rechaza los documentos porque su contenido no es un PDF ni una imagen
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y subo el archivo "falso.pdf" de tipo "application/pdf"
    Entonces veo el mensaje de error "No se ha podido subir el documento: Solo se pueden subir documentos PDF o imágenes JPEG o PNG"
    Y la cartera de documentos está vacía

  Escenario: Un archivo de más de 8 MB no se puede subir
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y subo un archivo "enorme.pdf" de tipo "application/pdf" de 8000001 bytes
    Entonces veo el mensaje de error "El documento no puede ocupar más de 8 MB"
    Y el servidor ha recibido 0 documentos

  Escenario: En un viaje archivado se ven los documentos pero no se puede subir ninguno
    Dado que tengo el viaje archivado "Roma 2026"
    Y que en la cartera del viaje "Roma 2026" está el documento "Reserva del hotel.pdf"
    Cuando abro la cartera de documentos del viaje "Roma 2026"
    Entonces veo en la cartera de documentos, por este orden, "Reserva del hotel.pdf"
    Y no veo el botón "Subir documento"
    Y veo el texto "ya no se pueden subir"
