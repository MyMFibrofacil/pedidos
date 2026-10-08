# Pedidos a medida

Aplicación web estática para tomar pedidos de Rivadavia, Moreira, Valeria Lotz,
Alan Alfonsín y Bongiovanni. Las pantallas mantienen sus rutas públicas actuales
y comparten la configuración, el estado, la lectura del catálogo y la lógica del
pedido.

## Mapa de carpetas

```text
Pedidos_medida/
├── index.html                    Portada para abrir las pantallas
├── clients.js                    Configuración única de clientes
├── app.js                        Punto de entrada de la aplicación
├── controller.js                 Compatibilidad con páginas antiguas en caché
├── src/
│   ├── bootstrap/                 Inicio común de la aplicación
│   ├── catalogs/                  Adaptadores para catálogos especiales
│   ├── config/                    Detección y configuración activa
│   ├── controller/                Coordinación de la pantalla
│   ├── data/                      Lectura de Google Sheets
│   ├── order/                     Resumen, mensaje y datos para Xubio
│   ├── state/                     Estado y cantidades del pedido
│   └── ui/                        Referencias a elementos HTML
├── rivadavia/                     Pantalla y documentación de Rivadavia
├── moreira/                       Pantalla y recursos de Moreira
├── valeria/                       Pantalla de Valeria Lotz
├── alan_alfonsin/                 Pantalla de Alan Alfonsín
├── bongiovanni/                   Pantalla y estilos de Bongiovanni
├── google_apps_script/pedidos/    Fuente del correo y la integración Xubio
├── impresion_presupuestos/        Servicio Python de impresión
├── google_sheets/                 Acceso directo a la hoja activa
└── tests/                         Pruebas de catálogo, correo e impresión
```

Las pantallas usan estos enlaces:

- `/rivadavia/`
- `/moreira/`
- `/valeria/`
- `/alan_alfonsin/`
- `/bongiovanni/`

## Responsabilidad de cada módulo

- `clients.js` define hojas, identificadores, textos y modo de envío de cada cliente.
- `src/data/google-sheets.js` obtiene datos de la pestaña configurada.
- `src/catalogs/` adapta formatos de catálogo particulares, como las tandas de Bongiovanni.
- `src/order/` calcula el resumen y prepara el mensaje y las unidades que recibe Xubio.
- `src/state/create-quantity-manager.js` administra las cantidades de familias, variantes, productos y materiales.
- `src/ui/` construye las tarjetas del catálogo y presenta el resumen del pedido.
- `src/ui/catalog-family-renderer.js` construye las tarjetas de familias, kits, variantes y productos.
- `src/ui/order-summary-renderer.js` presenta los totales y el detalle del pedido.
- `src/controller/create-app-controller.js` coordina cantidades, eventos y presentación.
- `src/bootstrap/start-app.js` crea contexto, estado y pantalla para el cliente activo.
- `google_apps_script/pedidos/` contiene el código fuente que se publica manualmente en Apps Script.
- `impresion_presupuestos/` consulta avisos internos, descarga el PDF y lo envía a la impresora.

La hoja activa de catálogo es **Lista Precios a Medida**, configurada por su ID en
`clients.js`. Los accesos directos antiguos por cliente no se usan como fuente de
la aplicación.

## Abrir localmente

Desde esta carpeta, iniciar un servidor estático y abrir la ruta del cliente. Por
ejemplo, con Python:

```powershell
python -m http.server 8765
```

Luego abrir `http://127.0.0.1:8765/bongiovanni/` (o cambiar por otra ruta).
También se puede usar Live Server.

## Comprobaciones

```powershell
node --test tests/bongiovanni.test.js tests/pedidos-mailer.test.js
python -m unittest tests.test_impresion_presupuestos -v
```

## Publicación y cambios

GitHub Pages sirve estas mismas carpetas; no hay compilación ni `main.py` para
la aplicación web. Después de cambiar HTML o JavaScript, conservar las rutas de
los clientes y validar los cinco catálogos.

Los cambios de correo y presupuesto requieren copiar los archivos de
`google_apps_script/pedidos/` al proyecto Apps Script y actualizar su despliegue.
Los cambios del servicio de impresión afectan la tarea de Windows
`Pedidos Medida - Imprimir Presupuestos`.

Las especificaciones del formato de Rivadavia están en [rivadavia/README.md](./rivadavia/README.md).
La pantalla de Bongiovanni está documentada en [bongiovanni/README.md](./bongiovanni/README.md).
