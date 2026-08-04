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
`CONFIG`), la app lee y escribe dos hojas nuevas:

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

| ID | USUARIO | NOMBRE | PASSWORD | ROL | ACTIVO |
|----|---------|--------|----------|-----|--------|

- `ACTIVO` — `SI` / `NO`
- `ROL` — uno de cuatro:

| Rol | Administración | Objetivos y parámetros | Autoriza aclaraciones y cancelaciones | Confirma dispersión | Pestañas visibles |
|---|---|---|---|---|---|
| `ADMIN` | sí | sí | sí | sí | todas |
| `SUP` | no | no | sí | no | todas menos Administración |
| `AUDITOR` | no | no | no | sí | solo Liquidación, Pre-Nómina, Indicadores |
| `OPERATIVO` | no | no | no | no | todas menos Administración |

Mientras la hoja `USUARIOS` esté vacía, la app permite entrar con **admin /
admin** para poder crear el primer administrador. En cuanto exista al menos un
usuario, ese acceso inicial deja de funcionar.

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
- `SOLICITUDES`: `TARIFA_CASETAS`
- `LIQUIDACION`: `ODOMETRO_INICIAL`, `ODOMETRO_FINAL`, `KM_ODOMETRO`, `KM_RUTA`,
  `DIFERENCIA_KM`, `REVISAR_KM`, `LIQUIDADO_POR`, `MOTIVO_ACLARACION`,
  `ACLARACION_POR`, `ACLARACION_FECHA`, `AUTORIZADO_POR`, `FECHA_AUTORIZACION`,
  `NOTA_AUTORIZACION`

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

### La sábana: dos momentos de escritura, ubicados por CP

La app escribe en la hoja **Transportadora** de la sábana en dos momentos
distintos, cada uno con sus propias columnas fijas, y **ambos ubican el
renglón por carta porte (CP)** — no por folio:

**Al guardar la Solicitud de Gasto** (antes del viaje, lo que se le asigna al
operador):

- **AF** — combustible asignado (el importe en $, no los litros)
- **AI** — casetas
- **AJ** — pensión
- **AK** — viáticos (se toma del campo *Comida* de la solicitud; es el único
  candidato que existe en ese formulario — si tu sábana entiende "viáticos"
  como otra cosa, dímelo y lo ajusto)

**Al liquidar** (al terminar el viaje, lo real ya conciliado):

- **AC** — odómetro inicial (KM inicial)
- **AD** — odómetro final (KM final)
- **AL** — maniobras
- **AM** — talachas
- **AN** — dádivas

Todas van por **posición de columna**, no por nombre de encabezado, así que
funcionan sin importar cómo se titulen ahí. Si en la sábana cambian de lugar,
se ajusta en `SABANA_COLUMNAS_SOLICITUD` y `SABANA_COLUMNAS_LIQUIDACION` del
Apps Script.

**Cómo se ubica el renglón:** la app busca en la sábana una columna cuyo
nombre sea `CP`, `Carta Porte` o similar, y ahí busca la primera carta porte de
la solicitud (`CARTAS_PORTE` puede traer varias, separadas por coma — se usa
la primera). Si la sábana no tiene columna de CP, se cae a buscar por `FOLIO`
como antes. Si el renglón no existe, se crea uno nuevo y se siembra la columna
de CP para que la siguiente escritura (la de liquidación) lo vuelva a
encontrar. El resto de los campos (folio, operador, ruta, cliente…) se sigue
colocando por coincidencia de encabezado, y esos se reconocen **sin distinguir
mayúsculas, acentos ni signos**: `Folio`, `FOLIO` y `folio` son la misma
columna, y `KM inicial` corresponde a `KM_INICIAL`.

Un fallo al escribir en la sábana no tumba la operación que lo originó (guardar
la solicitud o liquidar): esa queda guardada igual en el Sheet, y la app
**muestra un aviso en pantalla** explicando qué pasó.

**Si algo no llega a la sábana**, corre el menú **Master de Ruta → Probar
sábana** dentro del Google Sheet. Sin modificar nada, te dice si el ID está
configurado, si la sábana se puede abrir, qué hojas tiene, si encontró
`Transportadora`, qué encabezado hay hoy en cada una de las columnas fijas, y
si existe una columna de CP (o folio, como respaldo) con la que ubicar el
renglón del viaje.

## Objetivo semanal de KM

Full y Sencillo tienen dos objetivos: uno para servicio **foráneo** y otro para
**local** (1 500 km por defecto), configurables en Administración. En
Pre-Nómina, el selector *Tipo de servicio* elige cuál aplica; se preselecciona
solo con el tipo de servicio predominante de los viajes del periodo. Los demás
tipos de unidad tienen un objetivo único y el selector queda deshabilitado.

## Pre-Nómina

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

Se elige cuál de las dos cifras cuenta. La seleccionada aparece como **KM
realizados** y la otra debajo, como referencia — nunca se repite la misma cifra
en dos renglones:

- **Proyectados en la ruta** — la suma de los KM de las rutas de los servicios.
- **Registrados por odómetro** — la suma de `KM_ODOMETRO` de las liquidaciones.

En ambos casos solo cuentan los viajes **liquidados**. La elección se guarda en
la nómina (`FUENTE_KM`) junto con las dos cifras, y solo el administrador puede
cambiarla.

### Permisos

Los usuarios **operativo** y **supervisor** ven la pre-nómina completa pero no
pueden modificar sueldo, objetivos, porcentajes, montos ni la fuente de KM. Lo único que captura
es el **rendimiento real**; también puede elegir los periodos y marcar los
objetivos de cumplimiento. Todo lo demás aparece deshabilitado.

Igual que el resto del control de acceso, esto es un candado de interfaz: evita
errores y cambios indebidos en el uso normal, pero no sustituye una validación
en el servidor.

## Dispersión de gastos

En **Liquidación**, junto al botón *Liquidar viaje* aparece el botón
**Dispersión** — solo cuando el servicio ya está liquidado:

- **Gris, "○ Dispersión pendiente"** — todavía no se confirma. Un auditor o un
  administrador puede darle clic; antes de mandar la confirmación se muestra un
  resumen de los montos capturados (combustible real, casetas, pensión,
  viáticos, maniobras, talachas, dádivas, estacionamientos) para revisarlos.
- **Verde, "✔ Dispersado"** — ya se confirmó. Muestra quién y cuándo.

Al confirmarse, **los campos del servicio quedan bloqueados** (odómetro, fecha
finalizado, todos los gastos, la casilla de evidencia) y los botones de
Liquidar / Enviar a aclaración se ocultan: ya no se puede modificar información
de un servicio cuyo gasto ya se le pagó al operador. Mientras esté pendiente,
los campos se editan con normalidad. Una solicitud cuyo gasto ya se dispersó
tampoco se puede cancelar.

Solo un **administrador** puede revertir una dispersión ya confirmada (por si
se marcó por error); un auditor no puede deshacer su propia confirmación desde
la app.

En **Liquidación** también hay una tarjeta discreta que dice cuántos servicios
liquidados **hoy** siguen pendientes de dispersar (por ejemplo, *"3 servicios
pendientes de dispersar hoy"*), y la tabla de servicios trae una columna con el
estado de cada uno.

### Rol Auditor

Ve únicamente las pestañas **Liquidación**, **Pre-Nómina** e **Indicadores**;
no entra a Rutas, Solicitud de Gasto ni Administración. Su función es revisar
que los gastos capturados en Liquidación sean los reales antes de confirmar la
dispersión. En Pre-Nómina tiene los mismos candados que un operativo o
supervisor: no modifica objetivos, sueldo ni montos.

## Bitácora

Cada operación que llega al backend queda registrada con el usuario que la hizo,
la fecha y hora, la hoja afectada y un detalle legible. Se consulta en
**Administración → Bitácora**.

Conviene saber qué alcance tiene: la bitácora registra lo que pasa por el Apps
Script, y la identidad del usuario la manda la app. Sirve para saber quién hizo
qué en el uso normal del sistema, pero alguien que llame directo a la URL
`/exec` puede escribir con el nombre que quiera. Es trazabilidad operativa, no
una auditoría a prueba de manipulación.

## Nota sobre el acceso

El login es un control de acceso **de interfaz**, no de seguridad: la validación
ocurre en el navegador y las contraseñas se guardan en texto plano en el Sheet.
Sirve para separar roles y evitar que cualquiera entre a Administración, pero no
protege los datos frente a alguien que abra las herramientas de desarrollo o
llame directo a la URL del Apps Script. Si en algún momento se necesita
seguridad real, hay que validar en el Apps Script y restringir el acceso al
webhook.
