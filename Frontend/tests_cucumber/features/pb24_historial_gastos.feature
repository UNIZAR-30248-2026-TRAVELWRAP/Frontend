# language: es
Característica: Ver el historial de gastos (PB-24)
  Como miembro de un viaje
  Quiero ver en Control de Gastos los gastos del viaje con el total
  Para saber en qué se ha gastado el dinero del grupo

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Ver los gastos del viaje con el total, del más reciente al más antiguo
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" hay un gasto "Cena en el Trastevere" de 60.5 pagado por "Adriana" el "2027-05-12"
    Y que en el viaje "Roma 2027" hay un gasto "Taxi al aeropuerto" de 35 pagado por "Berta" el "2027-05-13"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Entonces el total gastado es "95,50 €"
    Y veo en el historial de gastos, por este orden, "Taxi al aeropuerto, Cena en el Trastevere"
    Y el gasto "Taxi al aeropuerto" lo pagó "Berta" el "13 may"
    Y el gasto "Cena en el Trastevere" lo pagó "Adriana" el "12 may"

  Escenario: Un viaje sin gastos muestra el aviso y un total de 0
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Entonces el total gastado es "0,00 €"
    Y veo el texto "Todavía no hay gastos en este viaje."

  Escenario: Un gasto nuevo aparece el primero del historial y suma al total
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en el viaje "Roma 2027" hay un gasto "Cena en el Trastevere" de 60.5 pagado por "Adriana" el "2027-05-12"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Y pulso el botón "Añadir Gasto"
    Y relleno el gasto con importe "12,34" y concepto "Entradas del Coliseo"
    Y pulso el botón "Registrar gasto"
    Entonces estoy en el control de gastos del viaje
    Y veo en el historial de gastos, por este orden, "Entradas del Coliseo, Cena en el Trastevere"
    Y el total gastado es "72,84 €"

  Escenario: En un viaje archivado se consultan los gastos pero no se pueden añadir
    Dado que tengo el viaje archivado "Lisboa 2026"
    Y que en el viaje "Lisboa 2026" hay un gasto "Cena en Alfama" de 48 pagado por "Adriana" el "2026-09-20"
    Cuando abro el control de gastos del viaje "Lisboa 2026"
    Entonces veo en el historial de gastos, por este orden, "Cena en Alfama"
    Y el total gastado es "48,00 €"
    Y no veo el botón "Añadir Gasto"
