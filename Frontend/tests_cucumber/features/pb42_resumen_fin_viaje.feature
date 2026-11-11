# language: es
Característica: Resumen de fin de viaje (PB-42)
  Como miembro de un viaje que ha terminado
  Quiero ver un resumen con lo más destacado
  Para recordar el viaje y saber cuánto se ha gastado y quién debe dinero

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: El resumen recorre las diapositivas del viaje
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el resumen del viaje "Roma 2027" tiene 178 euros de gasto, el Coliseo como actividad más votada y a Berta como alma del grupo
    Cuando abro el resumen del viaje "Roma 2027"
    Entonces veo la diapositiva "Portada"
    Cuando paso a la diapositiva siguiente
    Entonces veo el texto "días de aventura"
    Cuando paso a la diapositiva siguiente
    Entonces veo el texto "El gasto más alto: Cena Trastevere"
    Cuando paso a la diapositiva siguiente
    Entonces veo el texto "Coliseo"
    Cuando paso a la diapositiva siguiente
    Entonces veo el texto "Pagó la cuenta más veces"
    Cuando paso a la diapositiva siguiente
    Y paso a la diapositiva siguiente
    Entonces veo el texto "Adriana paga a Berta"

  Escenario: Al terminar el resumen se vuelve a Mis viajes
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el resumen del viaje "Roma 2027" tiene 178 euros de gasto, el Coliseo como actividad más votada y a Berta como alma del grupo
    Cuando abro el resumen del viaje "Roma 2027"
    Y paso a la última diapositiva
    Y pulso el botón "Ir a Mis viajes"
    Entonces estoy en mis viajes
