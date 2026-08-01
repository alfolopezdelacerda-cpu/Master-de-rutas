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

### Hoja `USUARIOS`

| ID | USUARIO | NOMBRE | PASSWORD | ROL | ACTIVO |
|----|---------|--------|----------|-----|--------|

- `ROL` — `ADMIN` (ve la pestaña Administración) u `OPERATIVO`
- `ACTIVO` — `SI` / `NO`

Mientras la hoja `USUARIOS` esté vacía, la app permite entrar con **admin /
admin** para poder crear el primer administrador. En cuanto exista al menos un
usuario, ese acceso inicial deja de funcionar.

### Columnas nuevas en hojas existentes

`configurarHojas()` las agrega solo:

- `RUTAS`: `OPTIMIZADA_FULL`, `COSTO_CASETAS_2E`, `COSTO_CASETAS_5E`, `COSTO_CASETAS_9E`
- `SOLICITUDES`: `TARIFA_CASETAS`
- `LIQUIDACION`: `ODOMETRO_INICIAL`, `ODOMETRO_FINAL`, `KM_ODOMETRO`, `KM_RUTA`, `DIFERENCIA_KM`, `REVISAR_KM`

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
calcula solo. Si el total supera por más de **20 km** los kilómetros de la ruta
registrada en el servicio, se muestra una advertencia para revisar el servicio y
se pide confirmación antes de liquidar. La tolerancia está en la constante
`TOLERANCIA_KM`.

## Nota sobre el acceso

El login es un control de acceso **de interfaz**, no de seguridad: la validación
ocurre en el navegador y las contraseñas se guardan en texto plano en el Sheet.
Sirve para separar roles y evitar que cualquiera entre a Administración, pero no
protege los datos frente a alguien que abra las herramientas de desarrollo o
llame directo a la URL del Apps Script. Si en algún momento se necesita
seguridad real, hay que validar en el Apps Script y restringir el acceso al
webhook.
