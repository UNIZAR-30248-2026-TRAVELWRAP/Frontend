# language: es
Característica: Galería de fotos compartida del viaje (PB-42)
  Como miembro de un viaje
  Quiero subir fotos a una galería compartida y verlas ampliadas
  Para que todo el grupo guarde y recuerde el viaje

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: La galería muestra las fotos del viaje de la más reciente a la más antigua
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Y que en la galería del viaje "Roma 2027" está la foto "trevi.jpg"
    Cuando abro la galería del viaje "Roma 2027"
    Entonces veo en la galería, por este orden, "trevi.jpg, coliseo.jpg"
    Y veo el texto "2 fotos"

  Escenario: Un PDF no se puede subir como foto y la galería no cambia
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Cuando abro la galería del viaje "Roma 2027"
    Y subo la foto "billete.pdf" de tipo "application/pdf"
    Entonces veo el mensaje de error "Solo se pueden subir fotos (JPEG, PNG o WebP) o vídeos (MP4, WebM o MOV)"
    Y veo en la galería, por este orden, "coliseo.jpg"
    Y el servidor ha recibido 0 fotos
