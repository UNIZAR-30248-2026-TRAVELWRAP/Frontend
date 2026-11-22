# language: es
Característica: Resumen de fin de viaje (PB-42)
  Como miembro de un viaje que ha terminado
  Quiero ver un resumen con lo más destacado
  Para recordar el viaje y compartir una imagen con lo más destacado

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: El resumen recorre las diapositivas del viaje
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el resumen del viaje "Roma 2027" tiene el Coliseo como actividad más votada y a Berta como alma del grupo
    Cuando abro el resumen del viaje "Roma 2027"
    Entonces veo la diapositiva "Portada"
    Cuando paso a la diapositiva siguiente
    Entonces veo el texto "días de aventura"
    Cuando paso a la diapositiva siguiente
    Entonces veo el texto "Coliseo"
    Cuando paso a la diapositiva siguiente
    Entonces veo el texto "Pagó la cuenta más veces"
    Cuando paso a la diapositiva siguiente
    Entonces veo el texto "1 foto"
    Y no veo el texto "El gasto más alto"
    Y no veo el texto "Balance final"

  Escenario: Al terminar el resumen se vuelve a Mis viajes
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el resumen del viaje "Roma 2027" tiene el Coliseo como actividad más votada y a Berta como alma del grupo
    Cuando abro el resumen del viaje "Roma 2027"
    Y paso a la última diapositiva
    Y pulso el botón "Ir a Mis viajes"
    Entonces estoy en mis viajes

  Escenario: Un viaje sin datos solo enseña lo que tiene
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el resumen del viaje "Roma 2027" no tiene votos, ni alma del grupo, ni fotos
    Cuando abro el resumen del viaje "Roma 2027"
    Entonces veo la diapositiva "Portada"
    Cuando paso a la diapositiva siguiente
    Entonces veo la diapositiva "Tiempo juntos"
    Y no veo el texto "Nadie votó actividades en este viaje"
    Y no veo el texto "0 fotos"

  Escenario: Se descarga una imagen con el resumen del viaje
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el resumen del viaje "Roma 2027" tiene el Coliseo como actividad más votada y a Berta como alma del grupo
    Cuando abro el resumen del viaje "Roma 2027"
    Y paso a la última diapositiva
    Y pulso «Descargar imagen»
    Entonces se descarga la imagen "TravelWrap-Roma-2027.png" de 1080 píxeles de ancho

  Escenario: Si no se puede cargar una foto no se descarga la imagen
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el resumen del viaje "Roma 2027" tiene el Coliseo como actividad más votada y a Berta como alma del grupo
    Y que las fotos del resumen del viaje "Roma 2027" no se pueden cargar
    Cuando abro el resumen del viaje "Roma 2027"
    Y paso a la última diapositiva
    Y pulso «Descargar imagen»
    Entonces veo un error que contiene "No se ha podido cargar alguna de las fotos para crear la imagen"
    Y no se ha descargado ninguna imagen
