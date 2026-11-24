# language: es
Característica: Ver el balance de cada miembro (PB-25)
  Como miembro de un viaje
  Quiero ver cuánto debo o me deben, y el saldo de los demás
  Para saber cómo están las cuentas del grupo

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que soy miembro, pero no creador, del viaje activo "Roma 2027"

  Escenario: Si he pagado un gasto de todos, me deben su parte
    Dado que en el viaje "Roma 2027" hay un gasto "Cena en el Trastevere" de 60 pagado por "Adriana" entre "Berta, Adriana"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Entonces mi saldo es "+30,00 €" y "Te deben"
    Y el saldo de "Berta" es "-30,00 €"

  Escenario: Al registrar un gasto se actualiza el balance
    Cuando abro el control de gastos del viaje "Roma 2027"
    Y pulso el botón "Añadir Gasto"
    Y relleno el gasto con importe "10" y concepto "Taxi"
    Y pulso el botón "Registrar gasto"
    Entonces estoy en el control de gastos del viaje
    Y mi saldo es "+5,00 €" y "Te deben"
    Y el saldo de "Berta" es "-5,00 €"
