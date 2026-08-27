# Master de Ruta · ADL Transportes

Aplicación web de una sola página para la gestión de rutas, solicitudes de gasto,
liquidación y pre-nómina. Los datos viven en un Google Sheet, al que la app se
conecta mediante un Google Apps Script publicado como `/exec`.

## Contenido

- `index.html` — la aplicación completa (HTML, CSS y JS en un único archivo).
- `apps-script/Codigo.gs` — el backend que va en el Apps Script del Sheet.

## Uso local

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
python3 -m http.server 8000
```

Luego visita http://localhost:8000

## Despliegue

Sitio estático servido desde la raíz del repositorio. Vercel lo publica sin
build: no hay dependencias ni paso de compilación.

---

## Instalación del backend (Apps Script)

1. Abre el Google Sheet → **Extensiones → Apps Script**.
2. Reemplaza todo el contenido del archivo por `apps-script/Codigo.gs`.
3. Ejecuta una vez la función **`configurarHojas()`**. Crea las hojas y columnas
   que falten sin tocar los datos que ya existan: las columnas nuevas se agregan
   al final de la fila de encabezados y no se reordena nada.
4. **Implementar → Nueva implementación → Aplicación web**, con
   *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier persona*.
5. Copia la URL `/exec` y pégala en **Administración → URL de conexión**, o
   actualiza la constante `WEBHOOK` en `index.html`.

Cada vez que cambies el código del Apps Script hay que crear una implementación
nueva (o actualizar la existente) para que la URL `/exec` sirva la versión nueva.

## Hojas del Google Sheet

`configurarHojas()` las crea solo, pero conviene saber qué espera cada una.
Además de las que ya usabas (`UNIDADES`, `OPERADORES`, `EJECUTIVOS`,
`REMOLQUES`, `CLIENTES`, `RUTAS`, `SOLICITUDES`, `NOMINAS`, `LIQUIDACION`,
`CONFIG`), la app lee y escribe estas hojas:

### Hoja `CASETAS`

| ID | NOMBRE | CARRETERA | COSTO_2E | COSTO_5E | COSTO_9E |
|----|--------|-----------|----------|----------|----------|

Un renglón por caseta, con su costo en cada categoría de ejes:

- `COSTO_2E` — Rabón, 3.5 T, 1.5 T y utilitaria (2 ejes)
- `COSTO_5E` — Sencillo (5 ejes)
- `COSTO_9E` — Full (9 ejes)

Se puede llenar a mano en el Sheet, o desde **Administración → Casetas**
(incluye importación por CSV con esos mismos encabezados).

> **Importante: la columna `ID` no se deja vacía.** Si capturas filas
> directamente en el Sheet sin llenar el ID, la app no puede distinguir un
> registro de otro y al elegir una caseta siempre guarda la primera del
> catálogo. El backend rellena los IDs faltantes solo, en cada escritura y al
> correr `configurarHojas()`; también está el menú **Master de Ruta → Asignar
> IDs faltantes**.

### Hoja `USUARIOS`

| ID | USUARIO | NOMBRE | PASSWORD | ROL | ACTIVO | PESTANAS |
|----|---------|--------|----------|-----|--------|----------|

- `ACTIVO` — `SI` / `NO`
- `ROL` — uno de cuatro:

| Rol | Administración | Objetivos y parámetros | Autoriza aclaraciones y cancelaciones | Confirma dispersión | Revierte dispersión | Pestañas por defecto |
|---|---|---|---|---|---|---|
| `ADMIN` | sí | sí | sí | no | sí | todas |
| `SUP` | no | no | sí | no | no | todas menos Administración |
| `AUDITOR` | no | no | no | sí | no | solo Dispersiones, Liquidación, Pre-Nómina, Indicadores |
| `OPERATIVO` | no | no | no | no | no | todas menos Administración |

Mientras la hoja `USUARIOS` esté vacía, la app permite entrar con **admin /
admin** para poder crear el primer administrador. En cuanto exista al menos un
usuario, ese acceso inicial deja de funcionar.

#### Permisos de pestañas por usuario

`PESTANAS` guarda una lista separada por comas (por ejemplo
`solicitud,dispersiones`) con las pestañas que ese usuario en particular puede
ver, **por encima** de lo que le tocaría por su rol. Vacío (el caso normal) =
se usan las pestañas por defecto de su rol, de la tabla de arriba.

Se administra desde **Administración → Usuarios**, columna **Permisos**: el
botón muestra "Por rol" cuando el usuario no tiene nada personalizado, o el
número de pestañas cuando sí. Al hacer clic se abre un panel con una casilla
por pestaña (selección múltiple) — **Rutas, Solicitud de Gasto, Dispersiones,
Liquidación, Pre-Nómina, Indicadores** — para marcar exactamente cuáles puede
ver ese usuario, sin importar su rol. El botón **Restablecer al rol** limpia
la personalización y vuelve a las pestañas por defecto.

**Administración queda fuera de este panel a propósito**: sigue siendo
exclusiva de `ROL=ADMIN` y no se puede otorgar a otros usuarios desde aquí,
para no exponer por accidente el borrado masivo, la configuración de precios
ni la URL de conexión al Sheet.

### Hoja `SOLICITUDES_CANCELADAS`

Copia completa de cada solicitud eliminada, más `MOTIVO_CANCELACION`,
`CANCELADA_POR`, `AUTORIZADA_POR`, `ROL_AUTORIZA` y `FECHA_CANCELACION`.

Una solicitud no se borra sin pasar por ahí: al pulsar la ✕ sale un cuadro que
pide el **motivo** y las **credenciales de un supervisor o administrador**
—distintas de las de quien está usando la app— y solo entonces se archiva y se
elimina. El backend archiva primero y borra después, así que si el archivado
falla la solicitud original no se pierde. Se consulta en
**Administración → Canceladas**, y el borrado masivo de solicitudes está
deshabilitado para que no haya forma de saltarse el paso. Una solicitud cuyo
gasto **ya fue dispersado** no se puede cancelar (ver más abajo).

### Hoja `SERVICIOS` y sus catálogos

Alta de servicios de la pestaña **Nuevo Servicio**. `MODALIDAD` es `TDC` o
`FWD` y `SABANA` guarda a qué hoja pertenece (`Transportadora` o
`Reexpedidora`) — **ese vínculo con la sábana todavía no está hecho**: por
ahora solo queda registrado en el propio renglón.

Los campos de catálogo se guardan **por nombre, no por ID**, para que el
renglón siga siendo legible aunque el catálogo cambie después.

`ESTATUS` es `PENDIENTE POR DESPACHAR`, `ASIGNADO` o `CANCELADO`. Cuando se
despacha, se llenan `ECONOMICO`, `PLACAS`, `OPERADOR`, `MEDIO_COMUNICACION`,
`ASIGNADO_POR` y `FECHA_ASIGNACION`.

Cinco catálogos nuevos la alimentan, todos con la misma forma (`ID`,
`NOMBRE`) y editables en Administración:

| Hoja | Alimenta |
|---|---|
| `TIPO_NEGOCIO` | Tipo de negocio |
| `ADUANAS` | Aduana / puerto |
| `ESTADOS` | Estado de origen |
| `CIUDADES` | Ciudad destino |
| `PROVEEDORES` | Línea transportista (solo en FWD) |

### Hoja `PAGO_X_KM`

| ORIGEN | DESTINO | KMS_RED | VJS_MES | KMS_MES | FULL | SENCILLO | RABON | TON_3_5 | TON_1_5 | KG_600 |
|---|---|---|---|---|---|---|---|---|---|---|

Tarifario que da un **monto de pago** a partir de los **kilómetros** del viaje
y del **tipo de unidad** que lo hizo. Lo usa el esquema de **nómina fija** de
la Pre-Nómina (ver "Pago por KM" más abajo). Se captura o se importa por CSV
desde **Administración → Pago x KM**.

`KMS_RED` es la columna con la que se busca; `VJS_MES` y `KMS_MES` son
informativas. Las seis columnas de tipo de unidad corresponden a `FULL`,
`SENCILLO`, `RABÓN`, `3.5 T`, `1.5 T` y `UTILITARIA` (esta última, `KG_600`).

### Hoja `BITACORA`

| ID | FECHA_HORA | USUARIO | NOMBRE | ROL | ACCION | HOJA | REGISTRO | DETALLE |
|----|------------|---------|--------|-----|--------|------|----------|---------|

La escribe solo el Apps Script: registra altas, ediciones, eliminaciones,
importaciones, cambios de parámetros, liquidaciones, aclaraciones e inicios y
cierres de sesión (incluidos los accesos rechazados). Se consulta en
**Administración → Bitácora**, con lo más reciente arriba, y no se puede editar
ni borrar desde la app. Conserva los últimos 10 000 renglones; el límite está en
la constante `BITACORA_MAX`.

### Columnas nuevas en hojas existentes

`configurarHojas()` las agrega solo:

- `RUTAS`: `OPTIMIZADA_FULL`, `COSTO_CASETAS_2E`, `COSTO_CASETAS_5E`, `COSTO_CASETAS_9E`
- `SOLICITUDES`: `TARIFA_CASETAS`, `DISPERSION`, `DISPERSADO_POR`, `FECHA_DISPERSION`,
  `GASTOS_ADICIONALES_JSON`, `DISP_COMBUSTIBLE`, `DISP_CASETAS`,
  `DISP_GASTOS_ADICIONALES_JSON`, `DISP_TOTAL`
- `OPERADORES`: `SUELDO_FIJO_SEMANAL`, `MEDIO_COMUNICACION`
- `LIQUIDACION`: `ODOMETRO_INICIAL`, `ODOMETRO_FINAL`, `KM_ODOMETRO`, `KM_RUTA`,
  `DIFERENCIA_KM`, `REVISAR_KM`, `LIQUIDADO_POR`, `MOTIVO_ACLARACION`,
  `ACLARACION_POR`, `ACLARACION_FECHA`, `AUTORIZADO_POR`, `FECHA_AUTORIZACION`,
  `NOTA_AUTORIZACION`, `GASTOS_ADICIONALES_JSON`, `DESCUENTO_GASTOS_ADICIONALES`,
  `SEGURIDAD_ESTADO`, `SEGURIDAD_INCIDENCIAS`, `SEGURIDAD_TIEMPO`,
  `SEGURIDAD_COMENTARIOS`, `SEGURIDAD_VALIDADO_POR`, `SEGURIDAD_FECHA_VALIDACION`
- `NOMINAS`: `DESCUENTO_GASTOS`, `TIPO_PAGO`, `SUELDO_FIJO`, `PAGO_SERVICIOS`,
  `DIFERENCIA_SERVICIOS`, `OBJ_LLEGADA_TIEMPO`, `OBJ_SIN_INCIDENCIAS`
- `SOLICITUDES_CANCELADAS`: `ESTADO_CANCELACION`
- `USUARIOS`: `PESTANAS`

## Nuevo Servicio

Alta del servicio, en su propia pestaña. Arriba a la derecha, un interruptor
**TDC / FWD** define la modalidad, y con ella a qué hoja de la sábana
pertenece el servicio: TDC → **Transportadora**, FWD → **Reexpedidora**. La
pantalla lo dice en todo momento. Ese **vínculo con la sábana todavía no está
hecho**: hoy la modalidad y la hoja destino solo se guardan en el registro.

El interruptor también cambia la **línea transportista**: en TDC es siempre
`ADL`, fija y de solo lectura; en FWD se habilita el catálogo de
**Proveedores**.

Se llenan solos, sin capturarse a mano:

| Campo | De dónde sale |
|---|---|
| Fecha de solicitud | Fecha y hora del alta. Al editar **no se mueve** |
| Semana | Se calcula con la cita de carga |
| Mes | Se calcula con la cita de carga |
| Ejecutivo | El usuario con la sesión abierta |
| Línea transportista | `ADL` cuando la modalidad es TDC |

**RF/Seco** y **OW/RT** son pares de casillas excluyentes: marcar una
desmarca la otra. **Estatus** es `ASIGNADO` o `CANCELADO`, y **Tipo de
unidad** ofrece Full, Sencillo, Rabón, 3.5 y 1.5.

### Estatus y flujo de despacho

Un servicio **TDC** nace con estatus **`PENDIENTE POR DESPACHAR`**: le falta
unidad y operador. Un **FWD** nace **`ASIGNADO`**, porque lo mueve un tercero.
En ambos casos se puede marcar **`CANCELADO`** a mano.

Los pendientes aparecen en **Solicitud de Gasto → Pendientes de despacho**.
Ahí se les captura:

| Campo | Cómo se llena |
|---|---|
| Económico | Catálogo de Unidades |
| Placas | **Solo**, de la unidad elegida |
| Operador | Catálogo de Operadores |
| Medio de comunicación | **Solo**, del operador elegido (`OPERADORES.MEDIO_COMUNICACION`) |

Al asignar, el servicio pasa a **`ASIGNADO`**, se firma con quién y cuándo
(`ASIGNADO_POR`, `FECHA_ASIGNACION`) y desaparece de la lista de pendientes.

### Prellenado por carta porte

Ya asignado el servicio, al capturar su **carta porte** en la Solicitud de
Gasto se prellenan solos el **económico**, las **placas**, el **tipo de
unidad**, el **operador** y la **fecha de servicio** (de la cita de carga), y
un aviso confirma de qué servicio se tomaron. Falta elegir la ruta, que no
existe en el servicio.

Si la carta porte pertenece a un servicio que sigue **pendiente de despacho**
—o que está **cancelado**— no se prellena nada: sale un aviso explicando por
qué.

### TDC y FWD

Cada modalidad tiene su pestaña con la lista de sus servicios, con búsqueda
por servicio, CP, cliente, booking, contenedor, PO, origen, destino, operador
o económico, y filtro por estatus. El botón *Editar* devuelve el servicio al
formulario de Nuevo Servicio.

**Asignación de Unidad** sigue pendiente de definir: hoy la asignación se hace
desde Pendientes de despacho.

## Qué viaja en cada guardado

Después de cada guardado queda **todo actualizado**, pero no todo viaja por el
mismo camino.

La respuesta del guardado trae los datos de trabajo y refresca la pantalla al
instante. Lo que **no** incluye son las dos hojas de archivo, `BITACORA` y
`SOLICITUDES_CANCELADAS`: crecen sin tope y solo se ven en Administración, y
con una bitácora de 8 000 renglones son ~1.7 MB que el Apps Script tendría que
leer, serializar y mandar en **cada** guardado.

Esas dos se refrescan **en segundo plano**, con una petición aparte que sale
justo después de que el guardado respondió. El resultado es el mismo —quedan
al día tras cada guardado— pero sin hacerte esperar por ellas. Si se
encadenan varios guardados seguidos, los refrescos se **coalescen** en uno
solo en vez de apilarse.

También se traen completas en la **carga inicial** y al pulsar **Actualizar**,
y bajo demanda al abrir su pestaña si aún no están en memoria.

Como la respuesta del guardado es parcial, la app **fusiona** en vez de
reemplazar: lo que no venga en ella se conserva.

Del lado del navegador, al guardar solo se **repinta la sección que estás
viendo**; las demás se dibujan al entrar a su pestaña.

## Cómo funciona el costo de casetas

Las casetas ya no se escriben a mano en la ruta: se eligen del catálogo. La ruta
guarda **qué casetas** la componen, no un monto fijo, así que el costo se calcula
según el tipo de unidad:

- Al crear la ruta, el campo *Costo de casetas* es automático y refleja la tarifa
  del tipo de unidad de la ruta.
- En **Solicitud de Gasto**, la misma ruta cambia de costo automáticamente si se
  elige otro tipo de unidad, con el desglose caseta por caseta debajo del campo.

Las rutas capturadas antes de este cambio conservan su `COSTO_CASETAS` guardado y
lo siguen usando en la solicitud. Para que se recalculen por tipo de unidad hay
que editarlas y seleccionar sus casetas del catálogo.

### Casetas entre tramos

Además de la lista de "Otras casetas de la ruta" (casetas sueltas, sin ubicación
particular), cada tramo tiene su propio botón **"＋ Caseta después de este
tramo"**: la caseta que agregues ahí queda ligada a la posición entre ese tramo
y el siguiente, para que quede claro en qué parte del recorrido va. Internamente
se guarda como un campo `TRAMO` (el índice del tramo) dentro de cada entrada de
`CASETAS_JSON`; el costo total no cambia por esto, se sigue sumando igual sin
importar la posición. Si borras el tramo del que dependía una caseta, la caseta
se recorre al tramo anterior, o pasa a la lista de casetas sueltas si era el
primero.

## Ruta optimizada para Full

En el alta de ruta hay un interruptor **Optimizada para Full**. Al activarlo la
ruta pasa a tipo de unidad `FULL` y queda bloqueada: si en Solicitud de Gasto se
elige esa ruta con una unidad que no sea Full, sale un aviso indicando que se
solicite al administrador una ruta nueva para ese tipo de unidad, y el guardado
queda impedido.

## Validación de kilómetros en Liquidación

Al liquidar se capturan **odómetro inicial** y **final**; el total de km se
calcula solo y se compara contra los kilómetros de la ruta registrada en el
servicio. La tolerancia es de **±15 km** (constante `TOLERANCIA_KM`) y aplica en
ambos sentidos: tanto de más como de menos.

Fuera de esa tolerancia el viaje **no se puede liquidar**. El botón de liquidar
se bloquea y aparece la caja de aclaración, donde se captura el motivo y el
servicio pasa a estatus **ACLARACION**.

Un servicio en aclaración solo lo puede desbloquear un **administrador** o un
**supervisor**, desde el mismo detalle del servicio: captura una nota de autorización y el estatus
pasa a `LIQUIDADO`. Queda registrado quién lo mandó a aclaración, con qué
motivo, y quién lo autorizó. Los usuarios operativos ven la caja pero sin el
botón de autorizar.

Mientras un viaje esté en aclaración no cuenta como liquidado, así que tampoco
cuenta para el pago en pre-nómina.

### La sábana: se escribe solo al liquidar, y solo esas celdas

La app escribe en la hoja **Transportadora** de la sábana en **un único
momento: al liquidar el viaje**. Guardar la Solicitud de Gasto **no** toca la
sábana — solo queda registrada en el Sheet interno de la app.

La escritura es **quirúrgica**: se tocan, celda por celda con `setValue()`,
**únicamente** estas diez columnas — ninguna otra celda del renglón se lee ni
se vuelve a escribir, así que no hay riesgo de borrar información capturada
ahí por otro medio:

| Columna | Campo | Origen |
|---|---|---|
| **AC** | Odómetro inicial (KM inicial) | Liquidación |
| **AD** | Odómetro final (KM final) | Liquidación |
| **AF** | Combustible $ (real) | Liquidación |
| **AG** | Combustible asignado | Solicitud |
| **AI** | Casetas (real) | Liquidación |
| **AJ** | Pensión | Liquidación |
| **AK** | Viáticos | Liquidación |
| **AL** | Maniobras | Liquidación |
| **AM** | Talachas | Liquidación |
| **AN** | Dádivas | Liquidación |

Todas van por **posición de columna**, no por nombre de encabezado, así que
funcionan sin importar cómo se titulen ahí. Si en la sábana cambian de lugar,
se ajusta en `SABANA_COLUMNAS_LIQUIDACION` del Apps Script.

Las columnas **F**, **K** y **AB** nunca se tocan, ni para escribir ni para
buscar.

**Cómo se ubica el renglón:** únicamente por la **carta porte**, en la columna
**N** por posición fija (constante `SABANA_COL_CP`) — no importa cómo esté
titulada esa columna en la sábana. Si `CARTAS_PORTE` trae varias (por ejemplo
`401 402`), se busca **la primera**. No hay respaldo por folio: la búsqueda es
solo por CP, para no leer ni escribir en ninguna otra columna.

Si esa carta porte **no existe** en la sábana, no se crea ningún renglón: la
operación falla con el aviso **«No se encontró la CP en Sábana»**.

Un fallo al escribir en la sábana no tumba la liquidación que lo originó: esa
queda guardada igual en el Sheet, y la app **muestra un aviso en pantalla**
explicando qué pasó.

**Si algo no llega a la sábana**, corre el menú **Master de Ruta → Probar
sábana** dentro del Google Sheet. Sin modificar nada, te dice si el ID está
configurado, si la sábana se puede abrir, qué hojas tiene, si encontró
`Transportadora`, qué encabezado hay hoy en cada una de las columnas fijas, y
qué hay en la columna de CP con la que se ubica el renglón del viaje.

## Validación de Seguridad en Liquidación

Al liquidar, la tarjeta **Validación de Seguridad** arranca en gris con el
estatus **Pendiente de validación**. Solo un usuario con rol **Administrador**
puede capturarla; los demás roles la ven en gris, de solo lectura, y no la
pueden modificar.

Se registran dos cosas:

- **¿Tuvo incidencias en ruta?**
- **¿Llegó a tiempo?** — si se destilda, aparece una caja de **comentarios**
  para explicar el retraso.

**Mientras no esté validada, el proceso de liquidación no se cierra**: ni el
botón *Liquidar viaje* ni *Autorizar y liquidar* la dejan pasar; sale un aviso
de que un administrador debe validarla. Al validar se firma con el nombre y la
fecha (`SEGURIDAD_VALIDADO_POR`, `SEGURIDAD_FECHA_VALIDACION`).

Lo que Seguridad registre aquí es lo que llena solo los **objetivos de
cumplimiento** de la Pre-Nómina.

## Objetivo semanal de KM

Full y Sencillo tienen dos objetivos: uno para servicio **foráneo** y otro para
**local** (1 500 km por defecto), configurables en Administración. En
Pre-Nómina, el selector *Tipo de servicio* elige cuál aplica; se preselecciona
solo con el tipo de servicio predominante de los viajes del periodo. Los demás
tipos de unidad tienen un objetivo único y el selector queda deshabilitado.

## Pre-Nómina

### Dos esquemas de pago

Arriba a la derecha de Pre-Nómina hay un interruptor **«Pago de nómina fija»**
que cambia el esquema completo:

Cada operador tiene **dos sueldos semanales** en Administración → Operadores,
uno por esquema: **Pago x objetivo** (`PAGO_NOMINAL_SEMANAL`) y **Pago fijo**
(`SUELDO_FIJO_SEMANAL`). Si un operador no tiene capturado su pago fijo, se usa
el *Pago fijo semanal por defecto* de Administración → Pre-nómina.

| | Variable (apagado) | Fija (encendido) |
|---|---|---|
| Sueldo | Pago x objetivo del operador | Pago fijo del operador |
| Objetivo de kilómetros | sí | **no aparece** |
| Objetivo de rendimiento | sí | **no aparece** |
| Apoyo para viaje | sí | **no aparece** |
| Pago por KM | no | sí |
| Objetivos de cumplimiento | sí | sí |
| Descuentos por adelantos | sí | sí |

El esquema usado queda guardado en la nómina (`TIPO_PAGO`: `FIJA` o
`VARIABLE`) y el PDF imprime solo los renglones que aplican.

### Sueldo

El sueldo se paga en **bruto** (semanal × semanas del periodo): no hay
descuento ni impuesto sobre el sueldo. Si necesitas restarle algo al
operador, es a través de los **descuentos por adelantos** (ver más abajo), no
de un porcentaje fijo sobre el sueldo.

### Pago por KM (solo en nómina fija)

Cada viaje **liquidado** del periodo se cotiza en la hoja `PAGO_X_KM` con sus
**km proyectados** (`SOLICITUDES.KM`) y su **tipo de unidad**:

1. Se busca en la columna `KMS_RED` el renglón cuyos km alcancen los del
   viaje. Si no coinciden exactos, se toma **el siguiente número hacia
   arriba** (500 km cubre un viaje de 400).
2. El monto sale de la columna del tipo de unidad del viaje: `FULL`,
   `SENCILLO`, `RABON`, `TON_3_5`, `TON_1_5` o `KG_600` (utilitaria).

Con el **total de servicios** así calculado:

- **No rebasa el sueldo fijo** → se paga **solo el sueldo**, sin bono.
- **Lo rebasa** → se paga el **sueldo + la diferencia + el bono por
  cumplimiento**.

La tarjeta lista viaje por viaje qué km de la tabla se usaron y con cuánto se
cotizó, para poder auditarlo. Se guarda en la nómina como `PAGO_SERVICIOS` y
`DIFERENCIA_SERVICIOS`.

Si los km de un viaje superan al renglón más alto de la tabla, se cotiza con
ese renglón y la fila se marca **«tope de la tabla»**. Si la tabla está vacía,
la tarjeta lo avisa en rojo en vez de pagar cero en silencio.

### Objetivos de cumplimiento

**Llegada en tiempo** y **Sin incidencias en ruta** no se capturan a mano: se
derivan de la **validación de Seguridad** de los viajes liquidados del periodo
(ver "Validación de Seguridad" más abajo). Se marcan solo si **todos** los
viajes validados del periodo llegaron a tiempo / no tuvieron incidencias.
**Evidencia en tiempo** sigue siendo manual.

### Apoyo para viaje

Monto fijo (1 500 por defecto, configurable en Administración) que se paga
escalonado según el cumplimiento del objetivo de KM del periodo:

| Cumplimiento | Se paga |
|---|---|
| 60% o más | 100% |
| 30% a 59% | 50% |
| menos de 30% | 20% |
| sin viajes liquidados | 0 |

El enunciado decía «más del 60%» y «del 30% al 59%», que deja fuera el tramo
59–60. Está implementado con **60% inclusive** al 100%: a partir de 60,00% se
paga completo. Si prefieres que 60% exacto caiga en el 50%, es un cambio de un
carácter.

Un **administrador** puede autorizar el apoyo al 100% aunque no se cumpla el
objetivo, con una casilla que solo él ve. Queda registrado en la nómina
(`APOYO_AUTORIZADO`, `AUTORIZADO_POR`) y en la bitácora.

### KM que cuentan para el objetivo

Solo cuentan los **KM registrados por odómetro** (suma de `KM_ODOMETRO` de las
liquidaciones) — es la única fuente que se usa contra el objetivo. Los **KM
proyectados en la ruta** se siguen mostrando, pero puramente como referencia
informativa; ya no hay selector para elegir entre una fuente u otra. En ambos
casos solo cuentan los viajes **liquidados**.

### Descuentos por adelantos al operador

Si en la Solicitud de Gasto se capturaron **gastos adicionales** al operador
(adelanto de nómina, pensión, hotel…) y ya se liquidó el viaje, la diferencia
entre lo **asignado** y lo **comprobado** (ver "Gastos adicionales al
operador" más abajo) aparece aquí, sumada por todos los viajes liquidados del
periodo, y se **resta del total a pagar** (o se suma, si el operador comprobó
más de lo que se le dio). La tarjeta lista cada concepto por folio y muestra
el total del periodo.

### Permisos

Los usuarios **operativo** no pueden modificar sueldo, objetivos, porcentajes,
montos ni tipo de unidad/servicio. Lo único que captura es el **rendimiento
real**; también puede elegir los periodos y marcar los objetivos de
cumplimiento. Todo lo demás aparece deshabilitado.

El **supervisor** tiene ese mismo candado, con una excepción: puede modificar
**tipo de unidad** y **tipo de servicio** (los que definen qué objetivo de KM
y de rendimiento aplican). El objetivo de KM en sí, el pago por km extra, las
semanas consideradas, el % de bono y el pago semanal del operador siguen
siendo exclusivos del **administrador**.

Igual que el resto del control de acceso, esto es un candado de interfaz: evita
errores y cambios indebidos en el uso normal, pero no sustituye una validación
en el servidor.

## Dispersión de gastos

La dispersión confirma que el **gasto que Operaciones solicitó** (combustible
asignado, casetas, pensión, comida, depósito de urea) ya se le pagó al
operador. Vive sobre la **Solicitud de Gasto**, no sobre la liquidación: puede
dispersarse antes o después de que el viaje se liquide — son procesos
independientes.

Tiene su propia pestaña, **Dispersiones**, con una tabla de todas las
solicitudes y su estado (Pendiente / Dispersado). Al abrir una:

- **Gris, "Dispersar"** — todavía no se confirma. Es **exclusivo del rol
  auditor**: nadie más puede activarlo, ni siquiera el administrador. Antes de
  mandar la confirmación se muestra un resumen de los montos para revisarlos.
- **Verde, "✔ Dispersado"** — ya se confirmó. Muestra quién y cuándo.

Solo un **administrador** puede revertir una dispersión ya confirmada (por si
se marcó por error) — pero no puede confirmarla él mismo; esa parte es
exclusiva del auditor.

### Montos dispersados

Lo que Operaciones pidió y lo que el auditor realmente dispersa son dos cosas
distintas, y la pantalla las muestra por separado. En **Montos dispersados**
—que solo el **auditor** captura, y solo mientras la dispersión siga
pendiente— van:

- **Combustible** y **Casetas**
- Un renglón por cada **pago adicional** de la solicitud (adelanto de nómina,
  pensión, hotel…), si los hay

Vienen precargados con lo solicitado, así que en el caso normal basta con
confirmar. Si se ajusta alguno, la pantalla muestra el **total dispersado** y
en cuánto **difiere** de lo solicitado. Queda guardado en la solicitud
(`DISP_COMBUSTIBLE`, `DISP_CASETAS`, `DISP_GASTOS_ADICIONALES_JSON`,
`DISP_TOTAL`) y, una vez confirmada la dispersión, pasa a solo lectura.

### Candado sobre la Solicitud de Gasto

Mientras la dispersión esté **pendiente**, el área de Operaciones puede abrir
la solicitud desde la tabla de **Solicitudes recientes** (clic en el
renglón) y modificarla por completo: operador, unidad, remolques, ruta,
pensión, comida, etc. — igual que si la estuviera capturando.

En cuanto se **confirma la dispersión**, la solicitud queda bloqueada: todos
los campos se deshabilitan y el botón de guardar se oculta. Si hay un error,
la salida es **cancelarla**:

- **Solicitud pendiente** (sin dispersar) — se cancela como siempre, con
  motivo y credenciales de un **supervisor o administrador**.
- **Solicitud ya dispersada** — solo un **auditor o administrador** puede
  cancelarla (se le pide autorizarlo con esas credenciales, igual que en el
  caso anterior). Al cancelarse queda marcada con estatus
  **"Dispersión Cancelada"** en vez de "Cancelada" a secas, visible en
  **Administración → Canceladas** (`ESTADO_CANCELACION`). Operaciones captura
  una solicitud nueva si hace falta, autorizada de nuevo por supervisión.

La pestaña Dispersiones tiene una tarjeta discreta con cuántas solicitudes
siguen pendientes de dispersar, y un buscador/filtro por folio, operador o
ruta.

### Carta porte duplicada

Al guardar una Solicitud de Gasto, si alguna de las cartas porte capturadas ya
está registrada en otra solicitud, el guardado se **bloquea por completo**: no
hay opción de "continuar de todos modos". Hay que corregir o quitar la carta
porte repetida antes de poder guardar.

## Gastos adicionales al operador

Además del gasto propio del viaje (combustible, casetas, pensión, comida),
la Solicitud de Gasto tiene una sección para capturar **adelantos** que no son
parte de ese gasto: **adelanto de nómina, pensión (hospedaje) u hotel**, con
selección múltiple de conceptos y su monto. Se suman al total de la solicitud
en un renglón aparte ("Gastos adicionales al operador").

**Comprobación al liquidar:** si la solicitud tenía adelantos, Liquidación
muestra una caja con cada concepto y lo asignado, y un campo para capturar
cuánto **comprobó** el operador. La diferencia (asignado − comprobado) puede
ir en dos sentidos:

- **Positiva** (comprobó de menos) → se **descuenta** en su Pre-Nómina.
- **Negativa** (comprobó de más) → se **abona** en su Pre-Nómina.

Esa diferencia, sumada por todos los viajes liquidados del periodo, aparece en
la tarjeta **Descuentos por adelantos al operador** de Pre-Nómina y se
resta (o suma) del total a pagar. Se guarda en la liquidación
(`GASTOS_ADICIONALES_JSON`, `DESCUENTO_GASTOS_ADICIONALES`) y en la nómina
registrada (`DESCUENTO_GASTOS`).

### Rol Auditor

Ve únicamente las pestañas **Dispersiones**, **Liquidación**, **Pre-Nómina** e
**Indicadores**; no entra a Rutas, Solicitud de Gasto ni Administración. Su
función es revisar que los montos de la solicitud sean correctos antes de
confirmar la dispersión. En Pre-Nómina tiene los mismos candados que un
operativo o supervisor: no modifica objetivos, sueldo ni montos.

## Bitácora

Cada operación que llega al backend queda registrada con el usuario que la hizo,
la fecha y hora, la hoja afectada y un detalle legible. Se consulta en
**Administración → Bitácora**.

Conviene saber qué alcance tiene: la bitácora registra lo que pasa por el Apps
Script, y la identidad del usuario la manda la app. Sirve para saber quién hizo
qué en el uso normal del sistema, pero alguien que llame directo a la URL
`/exec` puede escribir con el nombre que quiera. Es trazabilidad operativa, no
una auditoría a prueba de manipulación.

## Rendimiento del backend

Cada acción que llega al Apps Script (`doPost`) hacía dos barridos completos de
**todas** las hojas de datos en cada guardado: uno para asignar IDs a filas
capturadas a mano en el Sheet, y otro (`leerTodo()`) para devolver el estado
completo a la app. Con el catálogo creciendo, eso hacía cada guardado cada vez
más lento y, si el bloqueo (`LockService`) no alcanzaba a liberarse a tiempo,
terminaba en el error de "no se pudo guardar".

Dos ajustes para que los guardados sean rápidos sin importar qué tan grandes
sean las demás hojas:

- **El barrido de IDs faltantes ahora es selectivo.** En cada `doPost` solo se
  revisa la hoja (o las hojas) que esa acción realmente toca — por ejemplo,
  guardar una solicitud ya no revisa Rutas, Unidades, Clientes, etc. El barrido
  **completo** de todas las hojas se sigue haciendo, pero solo al cargar o
  presionar **⟳ Actualizar** (`doGet`), que ocurre con mucha menos frecuencia
  que cada guardado individual.
- **La sábana ya no se escribe al guardar la solicitud de gasto** (ver más
  arriba), lo que le quitaba una llamada a un Sheet externo (`openById`, que en
  Apps Script es notablemente lenta) a cada guardado de solicitud.
- El tiempo de espera del bloqueo (`lock.waitLock`) subió de 30 a 45 segundos,
  como margen adicional para que un guardado que sí tarda no le gane el
  bloqueo al siguiente y truene con error.

## Nota sobre el acceso

El login es un control de acceso **de interfaz**, no de seguridad: la validación
ocurre en el navegador y las contraseñas se guardan en texto plano en el Sheet.
Sirve para separar roles y evitar que cualquiera entre a Administración, pero no
protege los datos frente a alguien que abra las herramientas de desarrollo o
llame directo a la URL del Apps Script. Si en algún momento se necesita
seguridad real, hay que validar en el Apps Script y restringir el acceso al
webhook.
