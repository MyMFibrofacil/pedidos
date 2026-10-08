# Pedidos Rivadavia

## Modelo de datos actual de Rivadavia

La hoja de Rivadavia se lee desde Google Sheets y hoy la app soporta dos formatos:

### Formato recomendado

Separar la placa en su propia columna.

Columnas esperadas:

- `Familia`
- `Producto`
- `placas`
- `espesor`
- `tipo`
- `placa`

Tambien se aceptan estos nombres equivalentes para la columna de placa:

- `placa_corte`
- `placa de corte`
- `medida_placa`
- `medida de placa`

### Formato viejo

Si no existe columna de placa, la app intenta inferirla desde `Familia` con formato:

```text
GL15 - 260x183
1224 - 282x183
```

En ese caso:

- familia base: `GL15`
- placa: `260x183`

## Tipos de fila en Rivadavia

### `grupo`

Representa una familia compuesta por varios graficos/productos que se piden en bloque.

#### Grupo con una sola placa

Ejemplo conceptual:

```text
GL15
placa: 260x183
```

Comportamiento:

- la familia sigue cargandose con una sola cantidad
- la UI muestra `Placa de referencia: 260x183`
- el detalle interno multiplica todos los graficos por la cantidad elegida
- WhatsApp sale con formato:

```text
GL15
- Placa 260x183 (1 copia)
  - Grafico 1: 50 placas
  - Grafico 2: 34 placas
```

#### Grupo con varias placas

Ejemplo conceptual:

```text
1224
placas disponibles: 282x183, 275x183
```

Comportamiento:

- la familia aparece una sola vez
- cada placa aparece como sub-bloque colapsado
- la cantidad se carga por placa, no por grafico
- los graficos internos se calculan como multiplo fijo de esa placa
- no se pueden mezclar cantidades inconsistentes por grafico

Ejemplo:

- `Placa 282x183`, cantidad `2`
- `Grafico 1: 54 x 2 = 108`
- `Grafico 2: 18 x 2 = 36`

WhatsApp sale con formato:

```text
1224
- Placa 282x183 (2 copias)
  - Grafico 1: 108 placas
  - Grafico 2: 36 placas
```

### `individual`

Representa productos que no se manejan como grupo cerrado.

Comportamiento:

- todos se agrupan visualmente bajo la familia `Individuales`
- cada producto se carga por separado
- si existe placa asociada, se muestra al lado del nombre del producto

Ejemplos visibles:

- `Cajones - 260x183`
- `Esquema 16P - 260x183`

WhatsApp sale con formato:

```text
*3mm*
Individuales
- Cajones - 260x183: 50 placas
- Esquema 16P - 260x183: 45 placas
```

## Como construye la UI Rivadavia

Flujo general en [app.js](../src/controller/create-app-controller.js):

1. Detecta cliente activo.
2. Lee Google Sheets.
3. Agrupa por espesor.
4. Dentro de cada espesor:
   - agrupa familias `grupo`
   - detecta si tienen una sola placa o varias
   - agrupa `individual` bajo `Individuales`
5. Renderiza:
   - tabs por espesor
   - cards de familia
   - detalle/resumen fijo abajo
6. Genera el texto final y lo abre en WhatsApp.

## Formato del mensaje de WhatsApp en Rivadavia

El mensaje final intenta respetar esta jerarquia:

1. espesor
2. familia
3. placa
4. detalle de graficos o productos
5. resumen final

Ejemplo simplificado:

```text
*3mm*
GL15
- Placa 260x183 (1 copia)
  - Grafico 1: 50 placas
  - Grafico 2: 34 placas

Individuales
- Cajones - 260x183: 50 placas

RESUMEN FINAL
*Total 3 mm: 134 placas*
*Total general: 134 items*
```

Nota: el texto de `Total general` sigue saliendo como `items` porque esa etiqueta general todavia usa el comportamiento compartido actual.

