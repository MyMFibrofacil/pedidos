# Pedidos Bongiovanni

## Pantalla principal

Abrir `index.html` o la ruta `/bongiovanni/`. El módulo `precios-unitarios.js`
presenta cada producto como un desplegable: cerrado muestra nombre,
contenido completo y `Total`; abierto muestra los precios por unidad. La
apertura se conserva al cambiar cantidades o usar el buscador.
La vista no modifica los cálculos, las cantidades ni el envío. El enlace
anterior con `?vista=precios-unitarios` sigue funcionando.

La pantalla reutiliza el diseño y el controlador de los demás clientes. Lee la
pestaña `Bongiovanni` (`1969951303`) de `Lista Precios a Medida`.

## Cantidades y precios

Cada cantidad elegida corresponde a una tanda completa. Los botones `+` y `−`
agregan o quitan una tanda; también se puede escribir la cantidad. No hay
selectores `1 en 1`, `5 en 5` o `10 en 10`, ni indicador de paso.
El bloque de categoría se reemplaza por un único botón `Limpiar pedido`, que
vacía todas las cantidades del pedido.
La pestaña superior se oculta mientras haya una sola sección disponible.

El módulo `../src/catalogs/bongiovanni.js` interpreta las columnas `Producto`,
`salen`, `Tanda`, `$ Unitario` y `$ Total`. Las filas sin `Producto` se incorporan
al producto anterior: las sillas adicionales forman parte de esa misma tanda.
El precio de la tanda suma todos sus componentes. Si hay un total informado,
se verifica que coincida con la cantidad multiplicada por el precio unitario.

El detalle del pedido y el correo conservan el contenido completo de cada tanda.
Por ejemplo, dos tandas de Juguetero Bajo x2 incluyen 10 jugueteros y 4 sillas.

## Envío

Se utiliza el Apps Script compartido para enviar el correo únicamente a
`mymfibrofacil.web@gmail.com` y crear el presupuesto de Xubio para
`MARIA VICTORIA BONGIOVANNI` (`5482024`). Cada tanda se expande a sus unidades
reales, con los precios unitarios de la hoja. Como en los otros catálogos por
precio, se usa el producto Xubio `Particular` y se conserva la descripción.

La habilitación del cliente también debe estar presente en el despliegue de
`../google_apps_script/moreira_mailer/Code.gs`.

Abrir `index.html` desde un servidor estático local o publicar los archivos
manteniendo su estructura. Las pruebas locales no confirman el despliegue
ni la recepción real del correo.
