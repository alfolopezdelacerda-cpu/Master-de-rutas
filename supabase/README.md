# Migración a Supabase

La plataforma puede trabajar contra el **Google Sheet** (como siempre) o contra
**Postgres en Supabase**. Se elige en *Administración → Base de datos*: en cuanto
se captura la URL y la llave, la app guarda en Postgres. Vacías, sigue en el
Sheet. No hay que tocar código para cambiar de uno al otro.

## Por qué

Tres razones, en orden de importancia:

1. **El login de hoy es de interfaz, no de seguridad.** La validación ocurre en
   el navegador y las contraseñas están en texto plano en el Sheet. Con
   facturas, UUID timbrados, nómina y las CLABE de los proveedores adentro, eso
   ya no alcanza. Postgres permite permisos **por renglón**, cosa que un Google
   Sheet no puede dar.
2. **Cada guardado se forma en fila.** El Apps Script usa un candado global
   (`waitLock(45000)`): con varias personas capturando a la vez, el monitorista
   que registra un horario espera a que termine el auditor. No se afina; es cómo
   funciona.
3. **La cuota diaria.** Una cuenta gmail.com tiene 90 minutos de ejecución de
   Apps Script **al día** en total, no por usuario.

De paso desaparecen dos parches: las fotos de evidencia en base64 dentro de una
celda (límite de 50,000 caracteres, por eso se comprimen a 45,000) y el excluir
hojas pesadas de cada respuesta para que el guardado no tarde.

## Etapas

| | Qué hace | Estado |
|---|---|---|
| **1 · Piso** | Esquema, adaptador y migración de datos. La app trabaja contra Postgres. | Listo |
| **2 · Llave** | Supabase Auth, un usuario real por persona y permisos por rol y por cartera. | Pendiente |
| **3 · Afinado** | Tipar columnas, mover las fotos a Storage, reportes en SQL. | Pendiente |

> **La etapa 1 no mejora la seguridad y no pretende hacerlo.** Deja el acceso
> igual de abierto que hoy, a propósito: así, si algo se rompe, se sabe que fue
> la migración y no las políticas. Mientras la etapa 2 no esté aplicada, la
> plataforma sigue siendo tan abierta como con el Sheet.

## Pasos

### 1 · Crear el proyecto

En [supabase.com](https://supabase.com) → nuevo proyecto. Región la más cercana
(`us-east-1` o `us-west-1`). Guarda la contraseña de la base que te pida.

De *Project Settings → API* salen los tres datos que se usan más abajo:

- **URL del proyecto** — `https://xxxxxxxx.supabase.co`
- **anon key** — la pública, la que va en la app
- **service_role key** — la de administrador, salta todos los permisos. **No
  hace falta para nada de esto.** No la pegues en la app, ni en el repositorio,
  ni en un chat. Solo la pide el script de terminal, que es opcional.

### 2 · Aplicar el esquema

En *SQL Editor*, pegar y correr, en este orden:

1. `schema.sql` — las 34 tablas, sus índices, el sello de `actualizado_en` y la
   tabla `auditoria` con sus triggers.
2. `rls.sql` — prende RLS en todas las tablas con políticas abiertas (etapa 1).

`schema.sql` **no se edita a mano**: se genera del mapa `HOJAS` de
`apps-script/Codigo.gs`, que es la misma fuente que define las hojas hoy. Al
agregar una columna, se agrega ahí y se vuelve a generar:

```bash
node scripts/generar-esquema.mjs
```

### 3 · Capturar la conexión en la app

*Administración → Base de datos*: pegar la **URL del proyecto** y la **anon
key** —la pública, nunca la `service_role`— y darle a **Probar conexión**.
Debe decir que la tabla `servicios` respondió, todavía vacía.

**Todavía no le des a «Guardar y conectar».** Primero van los datos.

### 4 · Copiar los datos, desde la misma app

En esa misma pantalla, **Copiar datos ahora**. Lee el Sheet completo —incluidas
bitácora, canceladas y evidencias, que no viajan en la carga normal— y lo
escribe tabla por tabla, mostrando el avance y comparando al final cuántos
renglones quedaron de cada lado. No hace falta terminal ni instalar nada.

Antes de escribir nada compara el esquema de Supabase contra lo que el Sheet
trae de verdad. Si a la hoja se le agregaron columnas a mano que el mapa `HOJAS`
nunca supo, las lista **todas juntas** y da el `alter table` listo para pegar en
el SQL Editor. Vale la pena que sea así: PostgREST solo reporta la *primera*
columna que no reconoce de cada tabla, de modo que descubrirlas a fuerza de
reintentos tomaría una pasada por columna.

Es **idempotente**: cada renglón se escribe por su ID, así que repetirlo
actualiza en vez de duplicar. Eso permite hacer el corte sin parar la
operación:

1. Copiar una vez con el Sheet todavía en uso, para ver que todo pase bien.
2. Revisar en Supabase que los datos se vean como deben.
3. Volver a copiar al final del día para alcanzar lo último.
4. Recién ahí, **Guardar y conectar**.

**Solo verificar** compara los conteos sin escribir nada.

> A un renglón que venga del Sheet **sin ID** se le inventa uno derivado de su
> contenido, no al azar, justamente para que repetir la copia lo actualice en
> vez de meterlo de nuevo. El límite: si ese renglón se edita en el Sheet entre
> una copia y otra, cambia su huella y entra como nuevo — un renglón sin ID no
> tiene identidad propia y no hay de dónde agarrarse.

> Si dos renglones de la hoja traen el **mismo ID**, en Postgres son uno solo:
> ahí el ID es la llave y no puede repetirse. Se conserva el último y la app
> dice cuántos se colapsaron, para poder revisarlos en la hoja.

También existe `scripts/migrar-a-supabase.mjs`, que hace exactamente lo mismo
desde la terminal si algún día conviene automatizarlo. Ese sí pide la
`service_role key`.

### 5 · Hacer el cambio

**Guardar y conectar**. La app recarga todo desde Postgres y la píldora de
arriba dice *Conectado a Supabase*.

Si algo sale mal, **Volver al Google Sheet** regresa a como estaba. Lo capturado
en Supabase se queda en Supabase: no se copia de regreso, así que conviene
decidir pronto cuál es el bueno.

## La sábana sigue en Google

El renglón que se escribe en la hoja *Transportadora* al liquidar es un Google
Sheet ajeno a esto, así que se sigue escribiendo por Apps Script aunque los
datos ya estén en Postgres. La liquidación se guarda primero en la base; si la
copia a la sábana falla, la liquidación **ya quedó** y la app avisa. Por eso hay
que dejar el Apps Script publicado y su URL capturada, aunque ya no se use para
guardar.

## Qué se gana desde el primer día

- Las escrituras dejan de formarse en fila: se acabó la espera entre capturas.
- Se acaba la cuota diaria de Apps Script.
- **Auditoría real**: la tabla `auditoria` guarda el antes y el después de cada
  cambio en las 17 tablas que importan, con un trigger de base de datos. La hoja
  `BITACORA` registra lo que la app reporta; esto registra lo que de verdad
  pasó, lo reporte quien lo reporte.
- Índices en las columnas por las que la app de verdad busca (CP, SERVICIO_ID,
  folios, cliente, operador).

## Qué falta, y hay que decirlo

- **Seguridad**: es la etapa 2. Hasta entonces, igual de abierto que hoy.
- **Tipos**: todas las columnas son `text`, igual que en el Sheet. Es a
  propósito — varios campos que parecen números no lo son (`FOLIO` puede ser
  `OC-0001`, `CLABE` y `CP` llevan ceros a la izquierda) y varias fechas se
  guardan como `01/09/2026 06:30`, que no es una fecha ISO. Migrar fiel primero
  y tipar después es lo que hace que la migración se pueda verificar renglón por
  renglón.
- **Las fotos** siguen en base64 dentro de una columna. Mover a Storage es la
  etapa 3.
- **Editar desde el Sheet** se pierde: los catálogos se editan en Administración
  y en las pantallas de expediente, y la importación por CSV sigue igual.
