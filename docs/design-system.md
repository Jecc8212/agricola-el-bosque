# Design System · Agrícola El Bosque

> Implementado en [`src/index.css`](../src/index.css). Ese archivo es la fuente de verdad;
> este documento explica **por qué** cada valor es el que es.

## Principio rector

**Un instrumento de precisión, no una vitrina.**

Alguien va a mirar estas pantallas ocho horas al día para cuadrar asientos. Todo lo demás
se subordina a eso: densidad antes que aire, jerarquía por peso y posición antes que por
color, y color únicamente cuando algo *significa* algo.

La referencia no es una landing de agtech. Es un instrumento de medición: denso, legible,
silencioso.

---

## Color

### Por qué estos tres colores

No se eligieron de una rampa de framework. Salen de la operación:

| Familia | Origen | Trabajo asignado |
|---|---|---|
| **Verde Bosque** | El nombre de la empresa | Institucional: navegación, acción primaria, estado activo |
| **Ocre Cosecha** | La tierra del valle central | Atención sin alarma: avisos, pendientes, destacados |
| **Cereza** | El fruto de la casa | **Sólo lo negativo**: errores, descuadres, acciones destructivas |
| **Papel** | Neutros cálidos | Superficies y texto |

El verde está **desaturado a propósito**. Un `#22C55E` en pantalla ocho horas cansa la vista;
`#395c4c` sostiene una jornada completa. Los neutros son cálidos, no acero: una empresa
agrícola no es un banco, y el negro puro sobre crema se ve sucio.

La cereza **nunca es decorativa**. Si aparece, algo está mal. Esa disciplina es lo que la
hace legible de un vistazo en una pantalla llena de números.

### Regla dura: debe y haber no son bueno y malo

La tentación evidente es pintar el debe de verde y el haber de rojo. **Es un error de fondo.**
Debe y haber son estructura contable, no juicio de valor; un haber alto no es una mala
noticia. Pintarlos de semáforo entrena a la persona a leer mal su propio balance.

El color se reserva para lo que sí tiene valencia: **que el asiento cuadre o no cuadre**.
La distinción debe/haber se resuelve con posición de columna y peso tipográfico.

### El color nunca va solo

Todo chip, badge o fila con estado lleva **texto que dice lo mismo que el color**. Nadie
debería depender del tono para saber si un asiento está cuadrado — ni una persona daltónica,
ni alguien mirando la pantalla con sol de campo encima.

### Contrastes verificados

Todos los pares en uso están medidos contra WCAG 2.1 AA (4.5:1 texto, 3:1 controles).
Los valores están anotados en `src/index.css` junto a cada token.

| Rol | Claro | Oscuro |
|---|---|---|
| Texto principal | 16.64:1 | 13.78:1 |
| Texto secundario | 8.76:1 | 8.34:1 |
| Texto apagado (piso) | 6.23:1 | 5.29:1 |
| Botón primario | 7.48:1 | 5.37:1 |
| Botón destructivo | 7.66:1 | 5.22:1 |
| Chip de éxito | 9.68:1 | 6.25:1 |
| Chip de error | 9.62:1 | 5.80:1 |
| Borde de control | 4.10:1 | 3.60:1 |

Dos consecuencias que salieron de medir en vez de suponer:

- **`papel-500` no sirve para texto** (3.89:1 sobre canvas). El piso de texto apagado es
  `papel-600`. El 500 queda sólo para estado deshabilitado, que está exento.
- **El hairline decorativo y el borde de control no son el mismo token.** El separador de
  filas puede ser tenue; el borde de un input define el control y necesita 3:1.

---

## Tipografía

**Fira Sans** para lo que se lee. **Fira Mono** para lo que se coteja: códigos de cuenta,
RUT, IDs de centro de costo.

Las ligaduras van **desactivadas**. Un código de cuenta no es prosa y no debe transformarse
al renderizar.

### Cifras tabulares, en todo el sistema

`font-variant-numeric: tabular-nums` está activo en tablas, inputs numéricos y cualquier
elemento con clase `.num`. Los dígitos ocupan el mismo ancho, así que las unidades se
alinean solas en columna.

En un sistema donde cada pantalla es una columna de montos, esto no es una preferencia
estética: sin cifras tabulares, cotejar dos totales obliga a leer dígito por dígito.

### Escala

Base **14px**, no 16. Es una herramienta de escritorio densa, no un sitio de lectura.

| Token | px | Uso |
|---|---|---|
| `2xs` | 11 | Micro-labels, códigos secundarios |
| `xs` | 12 | Cabeceras de columna |
| `sm` | 13 | Fila de tabla en densidad alta |
| `base` | 14 | Interfaz por defecto |
| `lg` | 16 | Lectura larga |
| `xl` | 18 | Título de sección |
| `2xl` | 22 | Título de página |
| `3xl` | 28 | Cifra destacada |

**Excepción de móvil:** iOS hace zoom automático en cualquier input bajo 16px. Por eso los
`input`, `select` y `textarea` suben a 16px bajo 768px, sin excepción.

---

## Espaciado, radios y elevación

**Espaciado:** se usa la escala de 4px que Tailwind ya trae. No hay razón para pelearse con
el framework ni para inventar una escala paralela.

**Densidad de fila:** `row-sm` 28px · `row-md` 32px (por defecto) · `row-lg` 40px (táctil).

**Radios contenidos.** Una tabla contable con esquinas de 16px parece un juguete.

| Token | px | Uso |
|---|---|---|
| `xs` | 2 | Chips, badges |
| `sm` | 4 | Inputs, botones |
| `md` | 6 | Cards, dropdowns |
| `lg` | 8 | Modales, paneles |

**Sombras** tintadas con el neutro cálido, nunca negro puro.

### La elevación en modo oscuro no se hace con sombra

Una sombra sobre fondo oscuro es invisible. En modo oscuro la elevación se comunica con
**una superficie más clara**: `surface-raised` (#242920) sobre `canvas` (#14170f). Los
modales y popovers usan esa superficie, no la sombra.

---

## Motion

La pregunta no es cómo animar, sino **si animar**. El criterio viene de la frecuencia:
lo que se ve cien veces al día no se anima nunca.

| Elemento | Duración | Curva |
|---|---|---|
| Presión de botón | 160ms | `ease-out` |
| Fila de tabla en hover | 100ms | `ease` |
| Tooltip | 150ms | `ease-out` |
| Dropdown, select | 180ms | `ease-out` |
| Modal | 240ms | `ease-out` |
| Drawer | 320ms | `ease-drawer` |
| **Navegación entre módulos** | **ninguna** | — |
| **Recarga de datos en tabla** | **ninguna** | — |

### Reglas

- **Nada por encima de 300ms** en UI.
- **Jamás `ease-in`.** Retrasa el movimiento justo en el instante en que la persona está
  mirando, y hace que la interfaz se sienta lenta a igual duración.
- **Curvas fuertes.** Las de CSS por defecto no tienen carácter:
  `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
- **Nunca desde `scale(0)`.** Nada en el mundo real aparece de la nada. Las entradas parten
  de `0.96` con opacidad.
- **Propiedades explícitas, nunca `transition: all`.** Sólo `transform` y `opacity`, que
  corren en GPU.
- **Transiciones, no keyframes**, en cualquier cosa que se pueda disparar rápido: las
  keyframes reinician desde cero al interrumpirse.

### Qué sí se anima

Lo ocasional y lo que comunica un cambio de estado. El ejemplo canónico en este sistema es
el paso de **cuadrado → descuadrado**: es información que la persona necesita notar, y va
acompañada de `aria-live="polite"` para que también se anuncie a un lector de pantalla.

### Motion reducido

`prefers-reduced-motion` no apaga todo: conserva opacidad y color, que ayudan a comprender,
y elimina todo desplazamiento. Quien marca esa preferencia suele tener una razón médica.

---

## Decisiones tomadas contra la recomendación por defecto

UI/UX Pro Max propuso el patrón **Data-Dense Dashboard** y el par **Fira Sans / Fira Code**.
Ambos se adoptaron. Se descartaron tres cosas, con motivo:

| Recomendación | Decisión | Motivo |
|---|---|---|
| Paleta azul corporativo `#1E40AF` + ámbar | Verde Bosque / Ocre / Cereza | Es la paleta genérica de "enterprise". No dice nada de esta empresa. |
| Fira Code para títulos | Fira Sans para títulos, Fira Mono sólo para datos | Títulos en monoespaciada es un gesto estético que resta legibilidad en un ERP. |
| Patrón "Enterprise Gateway" | Descartado | Es una estructura de landing comercial. Esto es una herramienta interna. |

---

## Pendientes

- **Numeración del plan de cuentas.** Las fichas traen tres esquemas contradictorios y
  Costos e Ingresos vienen sin código. Bloquea el modelo de datos, no el diseño.
  Ver [`plan-de-cuentas.md`](plan-de-cuentas.md).
- **Fuentes autoalojadas.** Hoy cargan desde Google Fonts. Si el sistema se va a usar en
  campo con conectividad mala, conviene autoalojarlas (`@fontsource`, 2 dependencias).
  La decisión depende del contexto de despliegue.
- **Iconografía.** Aún no se elige set. Candidato natural: Lucide, por consistencia de
  grilla 24×24 y peso de trazo. Sin emojis como iconos, nunca.
