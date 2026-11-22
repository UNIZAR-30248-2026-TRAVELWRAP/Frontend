# language: es
Característica: Compartir fotos y vídeos de la galería (PB-64)
  Como miembro de un viaje
  Quiero compartir una foto o un vídeo de la galería desde el visor
  Para enviárselo a quien quiera sin salir de la aplicación

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: El menú de compartir del dispositivo recibe la foto que se está viendo
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Y que mi navegador puede compartir archivos
    Cuando abro la galería del viaje "Roma 2027"
    Y amplío la foto "coliseo.jpg"
    Y pulso compartir en el archivo ampliado
    Entonces el menú de compartir ha recibido "coliseo.jpg" de tipo "image/jpeg"
    Y no se descarga ningún archivo

  Escenario: Si el navegador no puede compartir archivos, la foto se descarga y se explica
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Y que mi navegador no puede compartir archivos
    Cuando abro la galería del viaje "Roma 2027"
    Y amplío la foto "coliseo.jpg"
    Y pulso compartir en el archivo ampliado
    Entonces se descarga el archivo "coliseo.jpg"
    Y veo el texto "Tu dispositivo no permite compartir archivos desde el navegador, así que se ha descargado para que lo envíes tú."

  Escenario: Cancelar el menú de compartir no muestra ningún aviso
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Y que mi navegador puede compartir archivos pero cancelo el menú
    Cuando abro la galería del viaje "Roma 2027"
    Y amplío la foto "coliseo.jpg"
    Y pulso compartir en el archivo ampliado
    Entonces el menú de compartir no ha recibido nada
    Y no se descarga ningún archivo
    Y no veo el texto "No se ha podido preparar el archivo para compartirlo"

  Escenario: Si no se puede obtener el archivo se avisa del error
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Y que el servidor no entrega el archivo "coliseo.jpg"
    Y que mi navegador puede compartir archivos
    Cuando abro la galería del viaje "Roma 2027"
    Y amplío la foto "coliseo.jpg"
    Y pulso compartir en el archivo ampliado
    Entonces veo el texto "No se ha podido preparar el archivo para compartirlo"
    Y el menú de compartir no ha recibido nada

  Escenario: Un vídeo también se comparte
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está el vídeo "paseo.mp4"
    Y que mi navegador puede compartir archivos
    Cuando abro la galería del viaje "Roma 2027"
    Y abro el vídeo "paseo.mp4"
    Y pulso compartir en el archivo ampliado
    Entonces el menú de compartir ha recibido "paseo.mp4" de tipo "video/mp4"

  Escenario: En un viaje archivado se puede compartir pero no borrar
    Dado que soy miembro, pero no creador, del viaje archivado "Roma 2026"
    Y que en la galería del viaje "Roma 2026" está la foto "coliseo.jpg"
    Y que mi navegador puede compartir archivos
    Cuando abro la galería del viaje "Roma 2026"
    Y amplío la foto "coliseo.jpg"
    Entonces no veo el botón "Borrar foto"
    Cuando pulso compartir en el archivo ampliado
    Entonces el menú de compartir ha recibido "coliseo.jpg" de tipo "image/jpeg"
