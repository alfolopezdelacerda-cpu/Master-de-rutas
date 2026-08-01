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

- `ROL` — `ADMIN` (ve la pestaña Administración) u `OPERATIVO`
- `ACTIVO` — `SI` / `NO`

Mientras la hoja `USUARIOS` esté vacía, la app permite entrar con **admin /
admin** para poder crear el primer administrador. En cuanto exista al menos un
usuario, ese acceso inicial deja de funcionar.

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

Un servicio en aclaración solo lo puede desbloquear un **administrador**, desde
el mismo detalle del servicio: captura una nota de autorización y el estatus
pasa a `LIQUIDADO`. Queda registrado quién lo mandó a aclaración, con qué
motivo, y quién lo autorizó. Los usuarios operativos ven la caja pero sin el
botón de autorizar.

Mientras un viaje esté en aclaración no cuenta como liquidado, así que tampoco
cuenta para el pago en pre-nómina.

## Objetivo semanal de KM

Full y Sencillo tienen dos objetivos: uno para servicio **foráneo** y otro para
**local** (1 500 km por defecto), configurables en Administración. En
Pre-Nómina, el selector *Tipo de servicio* elige cuál aplica; se preselecciona
solo con el tipo de servicio predominante de los viajes del periodo. Los demás
tipos de unidad tienen un objetivo único y el selector queda deshabilitado.

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
