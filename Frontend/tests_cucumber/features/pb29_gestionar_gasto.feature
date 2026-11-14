# language: es
Característica: Gestionar un gasto compartido (PB-29)
  Como miembro de un viaje
  Quiero ver el detalle de un gasto y poder modificarlo o eliminarlo
  Para corregir los gastos del grupo y que las cuentas se recalculen

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que soy miembro, pero no creador, del viaje activo "Roma 2027"

  Escenario: Ver el detalle de un gasto con la parte de cada uno
    Dado que en el viaje "Roma 2027" hay un gasto "Cena en el Trastevere" de 60 pagado por "Berta" entre "Berta, Adriana"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Y abro el detalle del gasto "Cena en el Trastevere"
    Entonces en el detalle veo el importe "60,00 €"
    Y en el reparto del gasto la parte de "Adriana" es "30,00 €"

  Escenario: Modificar el importe de un gasto
    Dado que en el viaje "Roma 2027" hay un gasto "Cena en el Trastevere" de 60 pagado por "Berta" entre "Berta, Adriana"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Y abro el detalle del gasto "Cena en el Trastevere"
    Y pulso el botón "Modificar"
    Y cambio el importe a "40"
    Y pulso el botón "Guardar cambios"
    Entonces estoy en el detalle del gasto
    Y el servidor ha guardado la edición del gasto "Cena en el Trastevere" con importe 40 entre "Berta, Adriana"

  Escenario: Eliminar un gasto tras confirmarlo
    Dado que en el viaje "Roma 2027" hay un gasto "Cena en el Trastevere" de 60 pagado por "Berta" entre "Berta, Adriana"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Y abro el detalle del gasto "Cena en el Trastevere"
    Y pulso el botón "Eliminar"
    Y confirmo la eliminación
    Entonces estoy en el control de gastos del viaje
    Y el servidor ha borrado el gasto "Cena en el Trastevere"

  Escenario: Cancelar la eliminación no borra el gasto
    Dado que en el viaje "Roma 2027" hay un gasto "Cena en el Trastevere" de 60 pagado por "Berta" entre "Berta, Adriana"
    Cuando abro el control de gastos del viaje "Roma 2027"
    Y abro el detalle del gasto "Cena en el Trastevere"
    Y pulso el botón "Eliminar"
    Y pulso el botón "Cancelar"
    Entonces el servidor no ha borrado ningún gasto
