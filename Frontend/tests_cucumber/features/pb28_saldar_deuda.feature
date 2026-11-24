# language: es
Característica: Marcar una deuda como saldada (PB-28)
  Como persona a la que le deben dinero en el viaje
  Quiero marcar como saldada la deuda cuando me la han pagado
  Para que las cuentas queden cuadradas sin registrar un gasto

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que soy miembro, pero no creador, del viaje activo "Roma 2027"

  Escenario: Quien recibe el dinero marca la deuda como saldada
    Dado que en el viaje "Roma 2027" hay un gasto "Entradas del Coliseo" de 20 pagado por "Adriana" entre "Berta, Adriana"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Y pulso el botón "Marcar como saldada la deuda de Berta"
    Entonces en la liquidación pendiente veo "Cuentas saldadas"
    Y en las deudas saldadas veo "Berta pagó 10 € a Adriana"

  Escenario: Quien marcó la deuda puede deshacer la marca
    Dado que en el viaje "Roma 2027" hay un gasto "Entradas del Coliseo" de 20 pagado por "Adriana" entre "Berta, Adriana"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Y pulso el botón "Marcar como saldada la deuda de Berta"
    Y pulso el botón "Deshacer la marca de saldada de la deuda de Berta"
    Entonces en la liquidación pendiente veo "Berta te paga a ti" con "10,00 €"
    Y no veo las deudas saldadas
