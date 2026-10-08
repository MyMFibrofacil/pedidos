# Impresión independiente de presupuestos web

Este proceso se ejecuta mediante la tarea de Windows
`Pedidos Medida - Imprimir Presupuestos`, una vez por minuto y con la sesión de
Windows iniciada. Lee los avisos internos de `mymfibrofacil@gmail.com` para
Bongiovanni, Moreira, Valeria Lotz y Alan Alfonsín. Descarga el PDF del
presupuesto ya creado en Xubio y lo envía a la impresora
predeterminada `Impresora Pablo Nico`. No requiere ejecutar FabricaApp.
Rivadavia no genera avisos de impresión y su identificador está excluido del
lector local.

El código está separado por responsabilidad: `mailbox.py` lee y confirma los
avisos, `xubio.py` descarga el PDF, `printer.py` lo envía a Windows,
`state.py` registra los pedidos procesados y `main.py` coordina la tarea.

La configuración y las credenciales cifradas para el usuario actual se guardan
en `%LOCALAPPDATA%\PedidosMedida\impresion_presupuestos`. No se guardan
contraseñas en esta carpeta ni en GitHub. En una instalación nueva se pueden
importar una sola vez desde un `.env` existente:

```powershell
python -m pip install -r impresion_presupuestos/requirements.txt
python -m impresion_presupuestos.setup --from-env 'RUTA_AL_ARCHIVO\.env'
python -m impresion_presupuestos.main --check
```

`--check` valida Gmail, Xubio y la impresora sin imprimir ni marcar correos.
El registro de ejecución queda en `impresion.log` dentro de la carpeta local
de configuración. Una impresión se registra como *enviada* cuando Windows
acepta el comando de impresión; la salida física se comprueba en la impresora.
