# language: es
Característica: Liquidación pendiente del viaje (PB-28)
  Como miembro de un viaje
  Quiero saber quién tiene que pagar a quién para saldar las cuentas
  Para acabar el viaje sin deudas pendientes ni pagos de más

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que soy miembro, pero no creador, del viaje activo "Roma 2027"

  Escenario: Si otra persona ha pagado algo que me corresponde, le pago yo
    Dado que en el viaje "Roma 2027" hay un gasto "Cena en el Trastevere" de 20 pagado por "Berta" entre "Berta, Adriana"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Entonces en la liquidación pendiente veo "Tú pagas a Berta" con "10,00 €"

  Escenario: Si he pagado algo de todos, me pagan la parte de los demás
    Dado que en el viaje "Roma 2027" hay un gasto "Entradas del Coliseo" de 20 pagado por "Adriana" entre "Berta, Adriana"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Entonces en la liquidación pendiente veo "Berta te paga a ti" con "10,00 €"

  Escenario: Sin gastos las cuentas están saldadas
    Cuando abro el control de gastos del viaje "Roma 2027"
    Entonces en la liquidación pendiente veo "Cuentas saldadas"

  Escenario: Al registrar un gasto se actualiza la liquidación
    Cuando abro el control de gastos del viaje "Roma 2027"
    Y pulso el botón "Añadir Gasto"
    Y relleno el gasto con importe "10" y concepto "Taxi"
    Y pulso el botón "Registrar gasto"
    Entonces estoy en el control de gastos del viaje
    Y en la liquidación pendiente veo "Berta te paga a ti" con "5,00 €"
