# language: es
Característica: Registrar un gasto compartido (PB-23)
  Como miembro de un viaje
  Quiero registrar un gasto con su concepto, importe, quién pagó y entre quiénes se divide
  Para que el grupo lleve las cuentas del viaje

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que soy miembro, pero no creador, del viaje activo "Roma 2027"

  Escenario: Registrar un gasto que pago yo y se divide entre todos
    Cuando abro la pantalla para añadir un gasto al viaje "Roma 2027"
    Y relleno el gasto con importe "60,50" y concepto "Cena en el Trastevere"
    Entonces la parte de "Berta" es "30,25 €"
    Y la parte de "Adriana" es "30,25 €"
    Cuando pulso el botón "Registrar gasto"
    Entonces estoy en el control de gastos del viaje
    Y el servidor ha guardado el gasto "Cena en el Trastevere" de 60.5 pagado por "Adriana" entre "Berta, Adriana"

  Escenario: No se puede registrar un gasto con un importe no válido
    Cuando abro la pantalla para añadir un gasto al viaje "Roma 2027"
    Y relleno el gasto con importe "0" y concepto "Cena"
    Y pulso el botón "Registrar gasto"
    Entonces veo el mensaje de error "El importe tiene que ser mayor que 0"
    Y sigo en la pantalla de añadir gasto
    Y el servidor no ha guardado ningún gasto
