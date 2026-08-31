# Tracking ADL (Sábana) · ADL Distribución & Transporte

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
> correr `configurarHojas()`; también está el menú **Tracking ADL → Asignar
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
| `AUDITOR` | no | no | no | sí | no | solo Dispersiones, Liquidación, Hoja de Servicio, Indicadores |
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
Liquidación, Hoja de Servicio, Indicadores** — para marcar exactamente cuáles puede
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

`CP` puede traer **varias cartas porte separadas por coma**: todas pertenecen
al mismo servicio y cualquiera de ellas lo ubica. Una carta porte no puede
estar en dos servicios: al guardar se comprueba y se rechaza el duplicado.

`ESTATUS` es `PENDIENTE POR DESPACHAR`, `ASIGNADO` o `CANCELADO`. Cuando se
despacha, se llenan `ECONOMICO`, `PLACAS`, `OPERADOR`, `MEDIO_COMUNICACION`,
`ASIGNADO_POR` y `FECHA_ASIGNACION`.

`ETAPA` es la que recorre los diez pasos del proceso operativo (ver "El
proceso operativo"), con las fechas de cada salto en `FECHA_GASTO`,
`FECHA_DISPERSION`, `FECHA_SALIDA`, `FECHA_FINALIZADO`, `FECHA_EVIDENCIA`,
`FECHA_LIQUIDACION` y `FECHA_PAGO`, más `SOLICITUD_ID`, `FOLIO_GASTO`,
`NOMINA_ID` y `NOTA_MONITOREO`.

Cinco catálogos nuevos la alimentan, todos con la misma forma (`ID`,
`NOMBRE`) y editables en Administración:

| Hoja | Alimenta |
|---|---|
| `TIPO_NEGOCIO` | Tipo de negocio |
| `ADUANAS` | Aduana / puerto |
| `ESTADOS` | Estado de origen |
| `CIUDADES` | Ciudad destino |
| `PROVEEDORES` | Línea transportista (solo en FWD) |
| `TIPOS_INCIDENCIA` | Tipo de incidencia en el monitoreo |

### Hojas `INCIDENCIAS` y `UBICACIONES`

Las dos las escribe el monitoreo y las dos son solo de consulta en la app.

| Hoja | Columnas |
|---|---|
| `INCIDENCIAS` | `ID`, `FECHA_HORA`, `SERVICIO_ID`, `CP`, `CLIENTE`, `ECONOMICO`, `OPERADOR`, `TIPO`, `DESCRIPCION`, `REGISTRADO_POR` |
| `UBICACIONES` | `ID`, `FECHA_HORA`, `SERVICIO_ID`, `CP`, `ECONOMICO`, `OPERADOR`, `UBICACION`, `REGISTRADO_POR` |
| `EVIDENCIAS` | `ID`, `FECHA_HORA`, `SERVICIO_ID`, `FOLIO`, `CP`, `OPERADOR`, `NOMBRE`, `IMAGEN`, `REGISTRADO_POR` |

`INCIDENCIAS` guarda lo que se reporta en ruta contra el servicio y su
operador; `UBICACIONES` es el histórico de ubicaciones capturadas a mano. La
última ubicación de cada unidad se copia además a `UNIDADES.UBICACION_ACTUAL`.
`EVIDENCIAS` guarda las fotografías del viaje que se suben al liquidar, ya
reducidas, en `IMAGEN` como data URL.

### Hoja `PAGO_X_KM`

| ORIGEN | DESTINO | KMS_RED | VJS_MES | KMS_MES | FULL | SENCILLO | RABON | TON_3_5 | TON_1_5 | KG_600 |
|---|---|---|---|---|---|---|---|---|---|---|

Tarifario que da un **monto de pago** a partir de los **kilómetros** del viaje
y del **tipo de unidad** que lo hizo. Lo usa el esquema de **nómina fija** de
la Hoja de Servicio (ver "Pago por KM" más abajo). Se captura o se importa por CSV
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
- `UNIDADES`: `ESTATUS_OPERATIVO`, `NOTA_OPERATIVA`, `ESTATUS_ACTUALIZADO`,
  `UBICACION_ACTUAL`, `UBICACION_ACTUALIZADA`
- `SOLICITUDES`: `SERVICIO_ID`
- `NOMINAS`: `PAGADA`, `PAGADA_POR`, `FECHA_PAGO`
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

## El proceso operativo

El **servicio** es la columna vertebral de la plataforma. Nace en Nuevo
Servicio y va avanzando de **etapa** conforme cada área hace su parte, de modo
que en cualquier momento se sabe dónde está cada viaje. Las etapas **no se
capturan a mano**: las mueve la pantalla que le toca a cada paso.

| # | Paso | Dónde se hace | Etapa a la que pasa |
|---|---|---|---|
| 1 | Solicitud para TDC | Nuevo Servicio | `SOLICITADO` |
| 2 | Asignación de unidad y operador | Asignación de Unidad | `ASIGNADO` |
| 3 | Asignación de gastos | Solicitud de Gasto | `GASTO SOLICITADO` |
| 4 | Dispersión | Dispersiones (auditor) | `DISPERSADO` |
| 5 | Monitoreo | Monitoreo → *Salida* | `EN RUTA` |
| 6 | Servicio finalizado | Monitoreo → *Finalizado* | `FINALIZADO` |
| 7 | Entrega de evidencia | Monitoreo → *Evidencia* | `EVIDENCIA ENTREGADA` |
| 8 | Liquidación de viaje | Liquidación | `LIQUIDADO` |
| 9 | Hoja de servicio | Hoja de Servicio → *Registrar nómina* | `EN PRE-NÓMINA` |
| 10 | Pago al operador | Hoja de Servicio → *Marcar pagada* | `PAGADO` |

Cada salto deja su **fecha** en el propio servicio (`FECHA_GASTO`,
`FECHA_DISPERSION`, `FECHA_SALIDA`, `FECHA_FINALIZADO`, `FECHA_EVIDENCIA`,
`FECHA_LIQUIDACION`, `FECHA_PAGO`), así que la traza del viaje completo se lee
en un solo renglón.

### Cómo se enlazan las etapas

Los pasos 1, 2, 5, 6, 7 y 10 los marca la pantalla directamente. Los pasos 3,
4, 8 y 9 los deduce el **backend**, que al guardar busca el servicio por su
carta porte y lo adelanta solo:

- Guardar una **solicitud de gasto** → `GASTO SOLICITADO` (o `DISPERSADO`, si
  el auditor ya la dispersó). La solicitud además guarda `SERVICIO_ID`.
- **Liquidar** un viaje → `LIQUIDADO`.
- **Registrar una nómina** → todos los viajes liquidados de ese operador pasan
  a `EN PRE-NÓMINA`; al marcarla **pagada**, a `PAGADO`.

Una etapa **nunca retrocede**: si se reedita la solicitud de un viaje que ya
está liquidado, se guardan los datos nuevos pero el servicio se queda donde
iba.

### Monitoreo

La pestaña **Monitoreo** es la vista del embudo: arriba, cuántos servicios hay
en cada una de las diez etapas —cada contador funciona como filtro—; abajo, la
lista de viajes con su estatus, sus citas y su cumplimiento. El filtro arranca
en *En proceso*, que esconde lo que ya se liquidó.

**Estatus del viaje** (`ESTATUS_MONITOREO`), con su color: En ruta, En espera
de carga, En espera de descarga, Descargando, Vacío, En taller, En resguardo,
Falla mecánica, Detenido, Siniestro y Servicio finalizado.

**Bitácora de horarios.** Al abrir un viaje se registran sus siete horarios,
cada uno sellado con la fecha y hora del momento en que se pulsa el botón:

| # | Horario | Deja el estatus en |
|---|---|---|
| 1 | Salida de patio | En ruta |
| 2 | Arribo a carga | En espera de carga |
| 3 | Ingreso a cargar | — |
| 4 | Inicio de ruta | En ruta |
| 5 | Arribo a destino | En espera de descarga |
| 6 | Ingreso a descarga | Descargando |
| 7 | Servicio finalizado | Servicio finalizado |

Se registran **en orden** —cada botón espera al anterior— y **el servicio no
se puede finalizar si falta alguno de los seis previos**; la pantalla dice
cuáles faltan. Tampoco se puede poner el estatus en *Servicio finalizado* a
mano sin haber cerrado la bitácora.

**Citas y cumplimiento.** La cita de carga (`CITA_CARGA`) y la de descarga
(`CITA_ENTREGA`) se muestran solas, tal como se capturaron en Nuevo Servicio.
De ahí salen los dos cumplimientos, sin capturar nada:

- `CUMPLIMIENTO_CARGA` — `ON TIME` si el **arribo a carga** fue a la cita de
  carga o antes; `OFF TIME` si fue después.
- `CUMPLIMIENTO_DESCARGA` — igual, comparando el **arribo a destino** contra
  la cita de descarga.

**Recordatorio de citas próximas.** Arriba de la pantalla aparece un aviso con
los servicios cuya cita de carga cae dentro de las **próximas 2 horas** y que
todavía no han registrado su arribo, con los minutos que faltan (o los que ya
pasaron, en rojo).

### Incidencias en ruta

En la bitácora del viaje, el botón **Reportar incidencia** abre una ventana
donde el monitorista elige el **tipo** del catálogo `TIPOS_INCIDENCIA` —desvío
de ruta, estadía no autorizada, retraso en carga, paro no autorizado, falla
mecánica, robo o siniestro, etc.— y escribe una **descripción breve**. Los dos
campos son obligatorios.

Cada incidencia queda en la hoja `INCIDENCIAS` ligada al **servicio** (por
`SERVICIO_ID` y carta porte) y al **operador**, con la unidad, la fecha y hora
y quién la reportó. Se ven en la propia bitácora, en el detalle del servicio y,
completas, en *Administración → Incidencias*.

El catálogo se edita en *Administración → Tipos de incidencia*, y
`configurarHojas()` lo siembra la primera vez con los tipos de arriba, para que
la pantalla sirva desde el arranque. Si la hoja quedara vacía, la app usa esa
misma lista por defecto.

### Ubicación de la unidad, a mano

La bitácora tiene un campo de **ubicación actual** con su botón *Registrar
ubicación*: cada captura deja un renglón en la hoja `UBICACIONES` —fecha y
hora, servicio, carta porte, unidad, operador y quién la reportó— y la última
se copia a `UNIDADES.UBICACION_ACTUAL` / `UBICACION_ACTUALIZADA`, que es lo que
se ve en el tablero operativo. Debajo del campo queda el histórico reciente.

También se puede capturar **desde el propio tablero operativo**, en la columna
*Ubicación*: se guarda igual y deja el mismo renglón en el histórico, ligándolo
al servicio en curso de esa unidad si trae uno.

### El monitoreo mueve el tablero operativo

Mientras el viaje está activo, el estatus del monitoreo **arrastra al estatus
de la unidad** en el tablero operativo, y al finalizar la libera:

| Estatus del viaje | Unidad en el tablero |
|---|---|
| En ruta · En espera de carga · En espera de descarga · Descargando · Detenido | En servicio |
| Vacío | Vacío |
| En taller | Mantenimiento |
| En resguardo | Descanso |
| Falla mecánica · Siniestro | Falla mecánica |
| **Servicio finalizado** | **Disponible** |

Y al **asignarle una unidad** a un servicio, esa unidad pasa sola a
**Programado**.

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

La asignación se hace en la pestaña **Asignación de unidad**, que lista los
servicios TDC filtrados por estatus (pendientes, asignados o todos). Ahí se
les captura:

| Campo | Cómo se llena |
|---|---|
| Económico | Catálogo de Unidades |
| Placas | **Solo**, de la unidad elegida |
| Operador | Catálogo de Operadores |
| Medio de comunicación | **Solo**, del operador elegido (`OPERADORES.MEDIO_COMUNICACION`) |

Al asignar, el servicio pasa a **`ASIGNADO`** y se firma con quién y cuándo
(`ASIGNADO_POR`, `FECHA_ASIGNACION`). El botón *Asignar* pasa a *Reasignar* y
precarga lo que ya tenía.

Cada renglón trae también un botón **Solicitud de gasto**, que salta a esa
pestaña con la carta porte puesta y el formulario prellenado. **Está
deshabilitado mientras al servicio le falte económico u operador**: sin eso no
se le puede pedir el gasto.

### Prellenado por carta porte

Ya asignado el servicio, al capturar su **carta porte** en la Solicitud de
Gasto —con el botón de arriba o escribiéndola a mano— se prellenan solos el
**económico**, las **placas**, el **tipo de unidad**, el **operador** y la
**fecha de servicio** (de la cita de carga), y un aviso confirma de qué
servicio se tomaron. Falta elegir la ruta, que no existe en el servicio.

Si la carta porte pertenece a un servicio que sigue **pendiente de despacho**
—o que está **cancelado**— no se prellena nada: sale un aviso explicando por
qué.

### TDC y FWD

Cada modalidad tiene su pestaña con la lista de sus servicios, con búsqueda
por servicio, CP, cliente, booking, contenedor, PO, origen, destino, operador
o económico, y filtro por estatus.

**Editar un servicio ya capturado es exclusivo de los roles `SUP` (líder) y
`ADMIN`.** A los demás roles ni siquiera se les pinta el botón *Editar* en TDC
y FWD; *Ver detalle* lo tienen todos.

Son el **registro histórico**: aquí se queda todo servicio capturado, también
los que ya terminaron, se liquidaron o se pagaron —ninguno se saca de la
lista—. Cada renglón muestra su **etapa** del proceso, y el botón **Ver
detalle** abre el seguimiento completo del viaje:

- los **siete horarios** de la bitácora de monitoreo, con la hora sellada de
  cada uno y los que quedaron sin registrar;
- las **citas** de carga y descarga con sus dos **cumplimientos**;
- la traza de **etapas**, con la fecha en que el servicio pasó por cada una;
- las **ubicaciones** reportadas y las **incidencias** del viaje;
- la nota del monitorista, si la hay.

**Solicitud de Gasto** conserva su tarjeta de **Solicitudes recientes**, desde
donde se reabre una solicitud para modificarla mientras siga pendiente de
dispersión.

### Tablero operativo

Debajo de la asignación, el **tablero operativo** lista toda la flota con su
estado: **Disponible, Programado, Despachado, En servicio, Vacío, Descanso,
Mantenimiento, Falla mecánica** o **Sin GPS**. Una unidad sin estado
capturado se muestra como *Disponible*.

El estado se cambia en el propio renglón y se guarda al momento, sellando
cuándo (`ESTATUS_ACTUALIZADO`); junto a él hay la **ubicación** —capturada a
mano, aquí o desde la bitácora del viaje— y una **nota** libre para el
detalle. Arriba, un resumen cuenta las unidades por estado y sirve de filtro
al hacerle clic; también se puede buscar por económico, placas o tipo. Cada
renglón muestra además el **servicio en curso** de esa unidad, si trae uno
asignado.

## Qué viaja en cada guardado

Guardar **solo devuelve las hojas que esa acción tocó**: guardar una ruta
responde con `RUTAS`, liquidar con `LIQUIDACION` y `SOLICITUDES`, y así. Antes
se releía y se mandaba el Sheet entero en cada guardado, que era el grueso del
tiempo de respuesta.

La app **fusiona** en vez de reemplazar, así que lo que no viene en la
respuesta se conserva de la carga anterior.

Además, lo que se acaba de guardar se aplica **también en local**, sin esperar
a que el backend lo devuelva. Así no puede pasar que la app confirme un
guardado y la pantalla siga mostrando lo anterior — el caso típico es un Apps
Script publicado viejo, que escribe bien pero no devuelve esa hoja. La
respuesta lo sobrescribe enseguida con lo que quedó realmente en el Sheet.

Las dos hojas de archivo, `BITACORA` y `SOLICITUDES_CANCELADAS`, crecen sin
tope y solo se ven en Administración, así que **no viajan nunca** en la
respuesta —ni siquiera en la carga inicial, para que entrar a la app sea
rápido—. Se piden aparte al **abrir su pestaña**, y a partir de ahí se
refrescan **en segundo plano** después de cada guardado, sin hacerte esperar
por ellas. Si se encadenan varios guardados, los refrescos se **coalescen** en
uno solo en vez de apilarse.

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

**Si algo no llega a la sábana**, corre el menú **Tracking ADL → Probar
sábana** dentro del Google Sheet. Sin modificar nada, te dice si el ID está
configurado, si la sábana se puede abrir, qué hojas tiene, si encontró
`Transportadora`, qué encabezado hay hoy en cada una de las columnas fijas, y
qué hay en la columna de CP con la que se ubica el renglón del viaje.

## Incidencias y evidencia en Liquidación

**Ya no hay validación de Seguridad que capturar.** En su lugar, la pantalla de
liquidación muestra dos cosas:

**Incidencias del viaje.** Si el monitorista reportó algo en ruta (ver
"Incidencias en ruta"), aparece aquí como **nota**, con su tipo, fecha,
descripción y quién la reportó. Es informativo: no bloquea nada. Al liquidar se
guarda el resumen en `INCIDENCIAS_NOTA` y cuántas fueron en `N_INCIDENCIAS`.

**Evidencia del viaje, con fotografías.** El paso 7 del proceso —la entrega de
evidencia— ya no se marca en Monitoreo: se registra aquí. Se agregan las
fotografías desde el propio panel; el navegador las **reduce y comprime**
(máximo ~1 100 px, JPEG) antes de subirlas, porque una celda del Sheet no
aguanta una foto de cámara completa. Cada foto queda en la hoja `EVIDENCIAS`
ligada al servicio y al folio, se ve como miniatura (clic para verla grande) y
se puede quitar. Con la primera fotografía cargada, el servicio pasa a la etapa
**Evidencia entregada**.

Esa hoja **no viaja en la carga general** ni en el refresco de segundo plano:
se pide sola al entrar a Liquidación, para no arrastrar las imágenes en cada
guardado.

Las columnas `SEGURIDAD_*` de `LIQUIDACION` se conservan por el histórico, pero
ya no se escriben.

## Objetivo semanal de KM

Full y Sencillo tienen dos objetivos: uno para servicio **foráneo** y otro para
**local** (1 500 km por defecto), configurables en Administración. En
Hoja de Servicio, el selector *Tipo de servicio* elige cuál aplica; se preselecciona
solo con el tipo de servicio predominante de los viajes del periodo. Los demás
tipos de unidad tienen un objetivo único y el selector queda deshabilitado.

## Hoja de Servicio

### Dos esquemas de pago

Arriba a la derecha de Hoja de Servicio hay un interruptor **«Pago de nómina fija»**
que cambia el esquema completo:

Cada operador tiene **dos sueldos semanales** en Administración → Operadores,
uno por esquema: **Pago x objetivo** (`PAGO_NOMINAL_SEMANAL`) y **Pago fijo**
(`SUELDO_FIJO_SEMANAL`). Si un operador no tiene capturado su pago fijo, se usa
el *Pago fijo semanal por defecto* de Administración → Hoja de servicio.

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

Los tres —**Llegada en tiempo**, **Evidencia en tiempo** y **Sin incidencias en
ruta**— se marcan **a mano**.

Debajo de las casillas se listan las **incidencias reportadas en el periodo**
para ese operador, con su tipo, fecha y descripción. Son **solo informativas**:
no marcan ni desmarcan ninguna casilla ni afectan el bono por sí solas; quien
arma la hoja decide con ellas a la vista.

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

- **Positiva** (comprobó de menos) → se **descuenta** en su Hoja de Servicio.
- **Negativa** (comprobó de más) → se **abona** en su Hoja de Servicio.

Esa diferencia, sumada por todos los viajes liquidados del periodo, aparece en
la tarjeta **Descuentos por adelantos al operador** de Hoja de Servicio y se
resta (o suma) del total a pagar. Se guarda en la liquidación
(`GASTOS_ADICIONALES_JSON`, `DESCUENTO_GASTOS_ADICIONALES`) y en la nómina
registrada (`DESCUENTO_GASTOS`).

### Rol Auditor

Ve únicamente las pestañas **Dispersiones**, **Liquidación**, **Hoja de Servicio** e
**Indicadores**; no entra a Rutas, Solicitud de Gasto ni Administración. Su
función es revisar que los montos de la solicitud sean correctos antes de
confirmar la dispersión. En Hoja de Servicio tiene los mismos candados que un
operativo o supervisor: no modifica objetivos, sueldo ni montos.

## Tiempos del proceso (Indicadores)

Debajo de las gráficas de siempre, la tarjeta **Tiempos del proceso** mide
cuánto tarda la operación en cada paso, con las fechas que el propio servicio
va dejando (`FECHA_SOLICITUD`, `FECHA_ASIGNACION`, `FECHA_GASTO`,
`FECHA_DISPERSION`, `FECHA_SALIDA`, `FECHA_FINALIZADO`, `FECHA_EVIDENCIA`,
`FECHA_LIQUIDACION`, `FECHA_PAGO`).

Se miden ocho tramos —Solicitud → Asignación, Asignación → Gasto, Gasto →
Dispersión, Dispersión → Salida, Salida → Finalizado, Finalizado → Evidencia,
Evidencia → Liquidación y Liquidación → Pago— más el **ciclo completo** de la
solicitud al pago. De cada uno sale el promedio, el más rápido y el más lento,
y solo cuentan los servicios que ya tienen las dos fechas del tramo.

Arriba, cuatro tarjetas con lo que más se pregunta: ciclo completo, cuánto se
tarda en **asignar la unidad**, en **dispersar los gastos** y en **liquidar**.
Abajo, una gráfica de promedio por paso y otra del ciclo completo por semana,
más la tabla con todo el detalle. Menos de un día se muestra en horas.

El filtro de periodo de Indicadores también aplica aquí.

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
