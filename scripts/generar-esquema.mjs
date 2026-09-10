#!/usr/bin/env node
/* Genera supabase/schema.sql a partir del mapa HOJAS de apps-script/Codigo.gs.
   El esquema NO se escribe a mano: se deriva de la misma fuente que hoy define
   las hojas, para que agregar una columna siga siendo un solo cambio.

   Uso:  node scripts/generar-esquema.mjs

   Nota sobre tipos: en esta primera etapa TODAS las columnas son `text`, igual
   que en el Sheet. Es a propósito. El Sheet nunca tuvo tipos, y varios campos
   que parecen numéricos no lo son —FOLIO puede ser "OC-0001", CLABE y CP son
   texto con ceros a la izquierda— y varias fechas se guardan como
   "01/09/2026 06:30", que no es una fecha ISO. Migrar primero fiel y tipar
   después es lo que hace que la migración sea verificable renglón por renglón.
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const gs = readFileSync(join(raiz, 'apps-script/Codigo.gs'), 'utf8');

/* ---------- Leer el mapa HOJAS ---------- */
const bloque = gs.match(/var HOJAS = \{([\s\S]*?)\n\};/);
if(!bloque) { console.error('No se encontró el mapa HOJAS en Codigo.gs'); process.exit(1); }

const hojas = [];
{
  const txt = bloque[1];
  // Cada entrada es NOMBRE: [ ...lista de columnas... ]
  // La coma final es opcional: la ÚLTIMA entrada del mapa no la lleva, y
  // exigirla dejaba esa hoja fuera del esquema sin avisar (así se perdió
  // PAGO_X_KM). Se acepta coma, fin de bloque o salto de línea.
  const rx = /(?:^|\n)\s*([A-Z][A-Z_0-9]*)\s*:\s*\[([\s\S]*?)\]\s*(?:,|\n|$)/g;
  let m;
  while((m = rx.exec(txt))){
    const nombre = m[1];
    const cols = [...m[2].matchAll(/'([^']+)'/g)].map(x=>x[1]);
    if(cols.length) hojas.push({ nombre, cols });
  }
}
if(!hojas.length){ console.error('No se leyó ninguna hoja'); process.exit(1); }

/* Una hoja que el regex no alcance a leer no da error: simplemente no se
   genera su tabla, y el problema recién aparece al migrar. Se cuentan las
   entradas con un barrido más laxo y se comparan. */
{
  const declaradas = [...bloque[1].matchAll(/(?:^|\n)\s*([A-Z][A-Z_0-9]*)\s*:\s*\[/g)].map(m=>m[1]);
  const perdidas = declaradas.filter(n=>!hojas.some(h=>h.nombre===n));
  if(perdidas.length){
    console.error('Estas hojas están en HOJAS pero no se pudieron leer:', perdidas.join(', '));
    process.exit(1);
  }
}

/* ---------- Índices que valen la pena ----------
   Las columnas por las que la app busca de verdad: la llave del viaje (CP),
   el amarre al servicio y los folios. Sin esto, cada pantalla haría un
   recorrido completo de la tabla. */
const INDEXAR = new Set(['CP','SERVICIO_ID','SOLICITUD_ID','TICKET_ID','CARTAS_PORTE',
                         'FOLIO','CLIENTE','OPERADOR','ECONOMICO','ESTADO','ESTATUS',
                         'ETAPA','REFERENCIA_ID','UUID','NOMBRE','USUARIO']);

const tabla = h => h.nombre.toLowerCase();
const q = s => '"'+s+'"';

const partes = [];
partes.push(`-- Esquema de Tracking ADL (Sábana)
-- GENERADO por scripts/generar-esquema.mjs a partir de apps-script/Codigo.gs
-- No editar a mano: vuelve a generarse y se pierde. Para cambiar una columna,
-- cámbiala en el mapa HOJAS y corre de nuevo el generador.
--
-- ${hojas.length} tablas. Todas las columnas son text en esta etapa, igual que
-- en el Sheet, para que la migración se pueda verificar renglón por renglón.

create extension if not exists pgcrypto;
`);

/* CONFIG vive aparte en el Sheet (clave/valor), y aquí igual */
partes.push(`
-- ---------------------------------------------------------------------------
-- CONFIG: los parámetros de la plataforma, igual que la hoja CONFIG
-- ---------------------------------------------------------------------------
create table if not exists config (
  clave  text primary key,
  valor  text,
  actualizado_en timestamptz not null default now()
);
`);

for(const h of hojas){
  const t = tabla(h);
  const cols = h.cols.filter(c=>c!=='ID');
  partes.push(`
-- ---------------------------------------------------------------------------
-- ${h.nombre} (${h.cols.length} columnas)
-- ---------------------------------------------------------------------------
create table if not exists ${t} (
  "ID" text primary key default gen_random_uuid()::text,
${cols.map(c=>`  ${q(c).padEnd(28)} text`).join(',\n')},
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);`);
  const idx = h.cols.filter(c=>INDEXAR.has(c));
  for(const c of idx){
    partes.push(`create index if not exists ${t}_${c.toLowerCase()}_idx on ${t} (${q(c)});`);
  }
}

/* ---------- actualizado_en automático ---------- */
partes.push(`

-- ---------------------------------------------------------------------------
-- actualizado_en se sella solo en cada UPDATE
-- ---------------------------------------------------------------------------
create or replace function sellar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end $$;
`);
for(const h of hojas){
  const t = tabla(h);
  partes.push(`drop trigger if exists ${t}_sellar on ${t};
create trigger ${t}_sellar before update on ${t}
  for each row execute function sellar_actualizado();`);
}

/* ---------- Bitácora de cambios ----------
   Lo que hoy hace la hoja BITACORA, pero a nivel de base: nadie puede
   escribir sin dejar rastro, ni siquiera llamando a la API por fuera. */
partes.push(`

-- ---------------------------------------------------------------------------
-- Bitácora a nivel de base de datos
-- La hoja BITACORA registra lo que la app reporta; esto registra lo que de
-- verdad pasó, lo reporte quien lo reporte. Es la diferencia entre
-- trazabilidad operativa y auditoría.
-- ---------------------------------------------------------------------------
create table if not exists auditoria (
  id          bigserial primary key,
  momento     timestamptz not null default now(),
  usuario_id  uuid,
  tabla       text not null,
  registro_id text,
  operacion   text not null,
  antes       jsonb,
  despues     jsonb
);
create index if not exists auditoria_tabla_idx   on auditoria (tabla, momento desc);
create index if not exists auditoria_usuario_idx on auditoria (usuario_id, momento desc);

create or replace function auditar()
returns trigger language plpgsql security definer as $$
begin
  insert into auditoria (usuario_id, tabla, registro_id, operacion, antes, despues)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(new."ID", old."ID"),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;
`);
/* Solo se audita lo que importa: catálogos como ESTADOS o CIUDADES no */
const AUDITAR = ['SERVICIOS','SOLICITUDES','LIQUIDACION','NOMINAS','GASTOS_EXTRA',
                 'CXC','FACTURAS','PAGOS','ORDENES_COMPRA','LIBERACIONES','CARTAS_PORTE',
                 'TARIFAS','USUARIOS','CLIENTES','PROVEEDORES','OPERADORES','UNIDADES'];
for(const n of AUDITAR){
  if(!hojas.some(h=>h.nombre===n)) continue;
  const t = n.toLowerCase();
  partes.push(`drop trigger if exists ${t}_auditar on ${t};
create trigger ${t}_auditar after insert or update or delete on ${t}
  for each row execute function auditar();`);
}

writeFileSync(join(raiz,'supabase/schema.sql'), partes.join('\n')+'\n');
console.log(`supabase/schema.sql · ${hojas.length} tablas, ${hojas.reduce((a,h)=>a+h.cols.length,0)} columnas`);

/* El adaptador del front necesita saber qué tablas existen: se emite aparte
   para no tener que repetir la lista a mano en index.html. */
writeFileSync(join(raiz,'supabase/tablas.json'),
  JSON.stringify(hojas.map(h=>h.nombre), null, 2)+'\n');
console.log('supabase/tablas.json · lista de tablas para el adaptador');
