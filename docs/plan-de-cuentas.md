# Plan de Cuentas — Agrícola El Bosque

> Fuente: las cuatro fichas `Ficha 1-2 Plan de Cuentas` (Activos, Pasivos, Costos, Ingresos).
> Extraído literalmente de los `.docx`. **No editar a mano**: si cambian las fichas, se regenera.

## Estructura jerárquica

Cada cuenta se describe en cuatro niveles y se traduce a un código contable. Primero se
definen los 4 dígitos iniciales, luego se concatenan los demás niveles hasta formar el
**ID General**, que es la llave única de integración entre módulos.

| Nivel | Contenido | Ejemplos |
|---|---|---|
| Cuenta principal | La clase contable | Activo · Pasivo · Costos · Ingresos |
| Clasificación | Agrupación secundaria | Circulante · Fijo · Operacional · No operacional |
| Subtipo | Familia dentro de la clasificación | Disponible · Materias primas · Cuentas por pagar |
| Detalle | La cuenta imputable | Caja · Fertilizantes · Remuneraciones Buin |

Los cuatro campos operativos de la empresa aparecen como dimensión propia en varias
familias: **Buin · Chumaco · Graneros · Los Lirios** (más una cuenta *General*).


---

## Activos

| Código | Cuenta Principal | Clasificación | Subtipo | Detalle | Saldo (Debe/Haber) |
|---|---|---|---|---|---|
| 1101 | Activo | Circulante | Disponible | Caja | Debe |
| 1102 | Activo | Circulante | Disponible | Bancos | Debe |
| 1103 | Activo | Circulante | Disponible | Depósitos a plazo | Debe |
| 1104 | Activo | Circulante | Disponible | Fondos por rendir | Debe |
| 1201 | Activo | Circulante | Materias primas | Agroquímicos | Debe |
| 1202 | Activo | Circulante | Materias primas | Fertilizantes | Debe |
| 1203 | Activo | Circulante | Materias primas | Combustible inventario | Debe |
| 1204 | Activo | Circulante | Materias primas | Ortopedia | Debe |
| 1205 | Activo | Circulante | Materias primas | Otras materias primas | Debe |
| 1301 | Activo | Circulante | Cuentas por cobrar | Clientes por ventas agrícolas | Debe |
| 1302 | Activo | Circulante | Cuentas por cobrar | Clientes por ventas no agrícolas | Debe |
| 1303 | Activo | Circulante | Cuentas por cobrar | Arrendos por cobrar agrícolas | Debe |
| 1304 | Activo | Circulante | Cuentas por cobrar | Arrendos por cobrar no agrícolas | Debe |
| 1305 | Activo | Circulante | Cuentas por cobrar | Descuentos por cobrar | Debe |
| 1306 | Activo | Circulante | Cuentas por cobrar | Préstamos a trabajadores | Debe |
| 1307 | Activo | Circulante | Cuentas por cobrar | Otras cuentas por cobrar | Debe |
| 1311 | Activo | Circulante | Cuentas por cobrar trabajadores | Anticipo remuneraciones Buin | Debe |
| 1312 | Activo | Circulante | Cuentas por cobrar trabajadores | Anticipo remuneraciones Chumaco | Debe |
| 1313 | Activo | Circulante | Cuentas por cobrar trabajadores | Anticipo remuneraciones Graneros | Debe |
| 1314 | Activo | Circulante | Cuentas por cobrar trabajadores | Anticipo remuneraciones Los Lirios | Debe |
| 1315 | Activo | Circulante | Cuentas por cobrar trabajadores | Anticipo remuneraciones General | Debe |
| 1316 | Activo | Circulante | Cuentas por cobrar trabajadores | Otros descuentos remuneraciones | Debe |
| 1401 | Activo | Circulante | Impuestos por recuperar | IVA crédito | Debe |
| 1402 | Activo | Circulante | Impuestos por recuperar | PPM | Debe |
| 1403 | Activo | Circulante | Impuestos por recuperar | Impuestos diferidos | Debe |
| 1501 | Activo | Circulante | Otros activos circulantes | Gastos pagados por anticipado | Debe |
| 1502 | Activo | Circulante | Otros activos circulantes | Otros descuentos por cobrar | Debe |
| 2101 | Activo | Fijo | Herramientas y equipos | Herramientas agrícolas | Debe |
| 2102 | Activo | Fijo | Herramientas y equipos | Herramientas oficina | Debe |
| 2103 | Activo | Fijo | Herramientas y equipos | Herramientas no agrícolas | Debe |
| 2201 | Activo | Fijo | Maquinarias y vehículos | Tractores agrícolas | Debe |
| 2202 | Activo | Fijo | Maquinarias y vehículos | Vehículos agrícolas | Debe |
| 2203 | Activo | Fijo | Maquinarias y vehículos | Vehículos no agrícolas | Debe |
| 2204 | Activo | Fijo | Maquinarias y vehículos | Motos agrícolas | Debe |
| 2205 | Activo | Fijo | Maquinarias y vehículos | Motos no agrícolas | Debe |
| 2206 | Activo | Fijo | Maquinarias y vehículos | Maquinaria pesada agrícola | Debe |
| 2301 | Activo | Fijo | Tecnología | Equipos agrícolas | Debe |
| 2302 | Activo | Fijo | Tecnología | Equipos no agrícolas | Debe |
| 2401 | Activo | Fijo | Bienes raíces | Terrenos agrícolas | Debe |
| 2402 | Activo | Fijo | Bienes raíces | Terrenos no agrícolas | Debe |
| 2403 | Activo | Fijo | Bienes raíces | Construcciones agrícolas | Debe |
| 2404 | Activo | Fijo | Bienes raíces | Construcciones no agrícolas | Debe |
| 2501 | Activo | Fijo | Plantaciones | Plantaciones agrícolas | Debe |
| 2502 | Activo | Fijo | Plantaciones | Plantaciones no agrícolas | Debe |

*44 cuentas.*


---

## Pasivos

| Código | Cuenta Principal | Clasificación | Subtipo | Detalle | Saldo (Debe/Haber) |
|---|---|---|---|---|---|
| 2111 | Pasivo | Circulante | Cuentas por pagar | Obligaciones bancarias | Haber |
| 2112 | Pasivo | Circulante | Cuentas por pagar | Honorarios por pagar | Haber |
| 2113 | Pasivo | Circulante | Cuentas por pagar | Proveedores | Haber |
| 2114 | Pasivo | Circulante | Cuentas por pagar | Cuentas por pagar varias | Haber |
| 2115 | Pasivo | Circulante | Cuentas por pagar | Contribuciones por pagar | Haber |
| 2116 | Pasivo | Circulante | Cuentas por pagar | Derechos de agua por pagar | Haber |
| 2117 | Pasivo | Circulante | Cuentas por pagar | Seguros de vida por pagar | Haber |
| 2118 | Pasivo | Circulante | Cuentas por pagar | Otras cuentas por pagar | Haber |
| 2121 | Pasivo | Circulante | Impuestos por pagar | Leyes sociales por pagar | Haber |
| 2122 | Pasivo | Circulante | Impuestos por pagar | Impuestos por pagar | Haber |
| 2123 | Pasivo | Circulante | Impuestos por pagar | Retención de honorarios | Haber |
| 2124 | Pasivo | Circulante | Impuestos por pagar | Impuesto único de 2ª categoría | Haber |
| 2131 | Pasivo | Circulante | Remuneraciones por pagar | Remuneraciones Buin | Haber |
| 2132 | Pasivo | Circulante | Remuneraciones por pagar | Remuneraciones Chumaco | Haber |
| 2133 | Pasivo | Circulante | Remuneraciones por pagar | Remuneraciones Los Lirios | Haber |
| 2134 | Pasivo | Circulante | Remuneraciones por pagar | Remuneraciones Graneros | Haber |
| 2135 | Pasivo | Circulante | Remuneraciones por pagar | Remuneraciones General | Haber |
| 2210 | Pasivo | Largo plazo | Créditos largo plazo | Créditos bancarios largo plazo | Haber |
| 2220 | Pasivo | Largo plazo | Obligaciones financieras | Obligaciones financieras largo plazo | Haber |

*19 cuentas.*


---

## Costos

| Cuenta Principal | Clasificación | Subtipo | Detalle | Saldo (Debe/Haber) |
|---|---|---|---|---|
| Costos | Operacional | Directos de producción | Agroquímicos – Insecticida | Debe |
| Costos | Operacional | Directos de producción | Agroquímicos – Acaricida | Debe |
| Costos | Operacional | Directos de producción | Agroquímicos – Herbicidas | Debe |
| Costos | Operacional | Directos de producción | Agroquímicos – Fungicida | Debe |
| Costos | Operacional | Directos de producción | Agroquímicos – Nematicida | Debe |
| Costos | Operacional | Directos de producción | Agroquímicos – Bioestimulantes | Debe |
| Costos | Operacional | Directos de producción | Agroquímicos – Control de plagas | Debe |
| Costos | Operacional | Directos de producción | Fertilizantes – Foliar | Debe |
| Costos | Operacional | Directos de producción | Fertilizantes – Fitoregulador | Debe |
| Costos | Operacional | Directos de producción | Fertilizantes – Orgánico | Debe |
| Costos | Operacional | Directos de producción | Soporte agrícola – Amarras | Debe |
| Costos | Operacional | Directos de producción | Insumos de riego | Debe |
| Costos | Operacional | Directos de producción | Herramientas agrícolas menores | Debe |
| Costos | Operacional | Directos de producción | Animales de apoyo | Debe |
| Costos | Operacional | Directos de producción | Reposición de plantas | Debe |
| Costos | Operacional | Directos de producción | Mano de obra agrícola – Aplicaciones químicas | Debe |
| Costos | Operacional | Directos de producción | Mano de obra agrícola – Cosecha (ej. Buin, Duraznos Andross, Planta adulta, Temporada 2026–2027) | Debe |
| Costos | Operacional | Directos de producción | Mano de obra agrícola – Desbrote de ramas secundarias | Debe |
| Costos | Operacional | Directos de producción | Mano de obra agrícola – Fertilización | Debe |
| Costos | Operacional | Directos de producción | Mano de obra agrícola – Poda (ej. Graneros, Cerezos Santina, Planta adulta, Temporada 2026–2027) | Debe |
| Costos | Operacional | Directos de producción | Contratistas | Debe |
| Costos | Operacional | Directos de producción | Servicios agrícolas – Mecanizados, trabajos de suelo, aplicaciones químicas, fletes | Debe |
| Costos | Operacional | Administración agrícola | Sueldos ADM agrícola – Supervisión general campo | Debe |
| Costos | Operacional | Administración agrícola | Sueldos ADM agrícola – Horas extras | Debe |
| Costos | Operacional | Administración agrícola | Honorarios – Contables, legales, consultorías, auditorías, otros | Debe |
| Costos | Operacional | Administración agrícola | Gastos de oficina – Papelería, mobiliario, útiles de aseo | Debe |
| Costos | Operacional | Administración agrícola | Mantención – Maquinaria, vehículos, equipos, infraestructura, reparaciones menores | Debe |
| Costos | Operacional | Administración agrícola | Servicios básicos – Agua, energía, gas, telefonía, internet, plataformas digitales, radios | Debe |
| Costos | Operacional | Administración agrícola | Servicios externos – Arriendos, seguridad | Debe |
| Costos | Operacional | Administración agrícola | Seguros – Vehículos, oficinas, campos, maquinarias, propiedad, siniestros | Debe |
| Costos | Operacional | Administración agrícola | Seguridad y prevención – EPP | Debe |
| Costos | Operacional | Depreciación activo fijo | Vehículos agrícolas – Camionetas | Debe |
| Costos | Operacional | Depreciación activo fijo | Maquinarias y equipos agrícolas – Herbicidas, Nebulizadoras | Debe |
| Costos | Operacional | Depreciación activo fijo | Herramientas agrícolas | Debe |
| Costos | Operacional | Depreciación activo fijo | Construcciones agrícolas – Sistema de riego | Debe |
| Costos | Operacional | Depreciación activo fijo | Plantaciones agrícolas – Nuevas plantaciones amortización | Debe |
| Costos | Operacional | No agrícolas directos | Insumos NAD – Alimentos perros | Debe |
| Costos | Operacional | No agrícolas directos | Mano de obra NAD – Nochero (ej. Buin, Temporada 2026–2027) | Debe |
| Costos | Operacional | No agrícolas directos | Otros costos no agrícolas | Debe |
| Costos | Operacional | Costos financieros directos | Gastos financieros | Debe |
| Costos | No operacional | Costos financieros no operacionales | Intereses, gastos financieros | Debe |
| Costos | No operacional | Otros costos no operacionales | Mano de obra no operacional – Ej. CAG1-NAH, Buin, Temporada 2026–2027 | Debe |
| Costos | No operacional | Otros costos no operacionales | Otros NOP – Reparaciones, mejoras, hipica, alimentos, seguros | Debe |

*43 cuentas.*


---

## Ingresos

| Cuenta Principal | Clasificación | Subtipo | Detalle | Saldo (Debe/Haber) |
|---|---|---|---|---|
| Ingresos | Operacionales | Agrícolas | Venta fruta – Mercado nacional | Haber |
| Ingresos | Operacionales | Agrícolas | Venta fruta – Mercado extranjero | Haber |
| Ingresos | Operacionales | Agrícolas | Servicios agrícolas | Haber |
| Ingresos | Operacionales | Agrícolas | Arriendos agrícolas | Haber |
| Ingresos | Operacionales | Agrícolas | Otros ingresos agrícolas | Haber |
| Ingresos | Operacionales | Otros ingresos directos | Arriendos no agrícolas | Haber |
| Ingresos | Operacionales | Otros ingresos directos | Servicios generales | Haber |
| Ingresos | Operacionales | Otros ingresos directos | Otros ingresos no agrícolas | Haber |
| Ingresos | No operacionales | Ingresos financieros | Intereses, dividendos, otros financieros | Haber |
| Ingresos | No operacionales | Otros ingresos | Subvenciones, indemnizaciones, extraordinarios | Haber |

*10 cuentas.*

