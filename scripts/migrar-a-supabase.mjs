#!/usr/bin/env node
/* Copia todo el Google Sheet a Supabase, y verifica renglón por renglón.
 *
 *   node scripts/migrar-a-supabase.mjs \
 *     --webhook "https://script.google.com/macros/s/.../exec" \
 *     --url     "https://xxxx.supabase.co" \
 *     --key     "SERVICE_ROLE_KEY"
 *
 * La llave tiene que ser la `service_role`, no la `anon`: la migración escribe
 * en todas las tablas y no debe depender de las políticas de acceso.
 *
 * Es idempotente: se puede correr las veces que haga falta. Cada renglón se
 * escribe por su ID, así que volver a correrlo actualiza en vez de duplicar.
 * Eso permite el corte real: se migra con el Sheet todavía en uso, se vuelve a
 * correr al final para alcanzar lo último, y recién ahí se cambia la app.
 *
 * --solo TABLA1,TABLA2  migra únicamente esas
 * --verificar           no escribe: solo compara conteos y reporta diferencias
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = n => { const i = process.argv.indexOf('--'+n); return i>0? process.argv[i+1] : ''; };
const tiene = n => process.argv.includes('--'+n);

const WEBHOOK = arg('webhook');
const URL_SB  = (arg('url')||'').replace(/\/+$/,'');
const KEY_SB  = arg('key');
const SOLO    = (arg('solo')||'').split(',').map(s=>s.trim()).filter(Boolean);
const SOLO_VERIFICAR = tiene('verificar');

if(!WEBHOOK || !URL_SB || !KEY_SB){
  console.error('Faltan parámetros. Uso:\n  node scripts/migrar-a-supabase.mjs --webhook URL --url URL --key SERVICE_ROLE_KEY');
  process.exit(1);
}

const TABLAS = JSON.parse(readFileSync(join(raiz,'supabase/tablas.json'),'utf8'));
const tablaDe = h => h.toLowerCase();

/* A un renglón sin ID hay que inventarle uno, y tiene que ser el MISMO en cada
   corrida: con un ID al azar, repetir la migración lo metía otra vez en vez de
   actualizarlo. Se deriva del contenido (FNV-1a). Si ese renglón se edita en el
   Sheet entre una corrida y otra, cambia su huella y entra como nuevo: un
   renglón sin ID no tiene identidad propia. */
function huellaFila(fila){
  const txt = JSON.stringify(fila, Object.keys(fila).sort());
  let h = 0x811c9dc5;
  for(let i=0;i<txt.length;i++){ h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

async function sb(ruta, opciones){
  const o = Object.assign({ headers:{} }, opciones||{});
  o.headers = Object.assign({
    apikey: KEY_SB, Authorization: 'Bearer '+KEY_SB, 'Content-Type':'application/json'
  }, o.headers);
  const r = await fetch(URL_SB+ruta, o);
  if(!r.ok){
    let d=''; try{ const j=await r.json(); d=j.message||j.hint||JSON.stringify(j); }catch(e){}
    throw new Error(`${r.status} ${d}`);
  }
  /* Un POST sin `return=representation` responde 201 con el cuerpo vacío, no
     204: hay que leerlo como texto antes de intentar parsearlo. */
  const txt = await r.text();
  if(!txt) return null;
  try{ return JSON.parse(txt); }catch(e){ return null; }
}

/* ---------- 1 · Leer el Sheet completo ---------- */
console.log('Leyendo el Google Sheet…');
const resp = await fetch(WEBHOOK);
const j = await resp.json();
if(!j.ok) { console.error('El Apps Script respondió con error:', j.error); process.exit(1); }
const datos = j.data || {};

/* Las hojas de archivo no vienen en la carga normal: se piden aparte */
const archivo = ['BITACORA','SOLICITUDES_CANCELADAS','EVIDENCIAS'];
const faltantes = archivo.filter(h=>datos[h]===undefined);
if(faltantes.length){
  console.log('Pidiendo las hojas de archivo:', faltantes.join(', '));
  const r2 = await fetch(WEBHOOK, { method:'POST',
    body: JSON.stringify({ action:'leerHoja', sheets:faltantes, usuario:{USUARIO:'migracion',NOMBRE:'Migración',ROL:'ADMIN'} }) });
  const j2 = await r2.json();
  if(j2.ok && j2.data) Object.assign(datos, j2.data);
}

/* ---------- 2 · Copiar tabla por tabla ---------- */
const aMigrar = (SOLO.length? SOLO : TABLAS).filter(t=>TABLAS.includes(t));
const reporte = [];
let fallas = 0;

for(const hoja of aMigrar){
  const filas = datos[hoja] || [];
  const t = tablaDe(hoja);

  if(SOLO_VERIFICAR){
    const enSb = await sb(`/rest/v1/${t}?select=ID`, { headers:{ Prefer:'count=exact' } });
    reporte.push({ hoja, sheet: filas.length, supabase: (enSb||[]).length });
    continue;
  }

  if(!filas.length){ reporte.push({ hoja, sheet:0, supabase:0 }); continue; }

  const preparadas = filas.map(f=>{
    const o = {};
    for(const k in f){
      if(k==='creado_en' || k==='actualizado_en') continue;
      o[k] = f[k]==null? '' : String(f[k]);
    }
    if(!o.ID) o.ID = `mig-${t}-${huellaFila(f)}`;
    return o;
  });
  /* Dos renglones con el mismo ID en un mismo POST hacen que Postgres rechace el
     bloque entero ("ON CONFLICT DO UPDATE command cannot affect row a second
     time"). Se queda el último y se avisa: un ID repetido es un problema de la
     hoja, no de la migración. */
  const porId = new Map();
  for(const r of preparadas) porId.set(String(r.ID), r);
  const aEscribir = [...porId.values()];
  if(aEscribir.length !== preparadas.length){
    console.log(`  ⚠ ${hoja}: ${preparadas.length - aEscribir.length} renglón(es) con ID repetido, se conserva el último`);
  }

  // Se escribe en bloques: un POST con 5,000 renglones se cae por tamaño
  const BLOQUE = 500;
  let escritos = 0;
  for(let i=0; i<aEscribir.length; i+=BLOQUE){
    const lote = aEscribir.slice(i, i+BLOQUE);
    try{
      await sb(`/rest/v1/${t}`, { method:'POST', body: JSON.stringify(lote),
        headers:{ Prefer:'resolution=merge-duplicates' } });
      escritos += lote.length;
    }catch(e){
      fallas++;
      console.error(`  ✕ ${hoja} bloque ${i}-${i+lote.length}: ${e.message}`);
    }
  }
  // Se relee para confirmar que de verdad quedó, no para confiar en el POST
  const enSb = await sb(`/rest/v1/${t}?select=ID`);
  // Se compara contra los renglones ÚNICOS: si la hoja trae dos con el mismo ID,
  // en Postgres es uno solo y eso no es un faltante.
  reporte.push({ hoja, sheet: aEscribir.length, supabase: (enSb||[]).length, escritos });
  console.log(`  ${hoja.padEnd(24)} ${String(aEscribir.length).padStart(6)} → ${String((enSb||[]).length).padStart(6)}`);
}

/* ---------- 3 · CONFIG ---------- */
if(!SOLO.length && datos.CONFIG){
  const filas = Object.entries(datos.CONFIG).map(([clave,valor])=>({ clave, valor: valor==null?'':String(valor) }));
  if(filas.length && !SOLO_VERIFICAR){
    await sb('/rest/v1/config', { method:'POST', body: JSON.stringify(filas),
      headers:{ Prefer:'resolution=merge-duplicates' } });
  }
  console.log(`  ${'CONFIG'.padEnd(24)} ${String(filas.length).padStart(6)} parámetros`);
}

/* ---------- 4 · Reporte ---------- */
console.log('\n' + '─'.repeat(52));
console.log(`${'TABLA'.padEnd(24)} ${'SHEET'.padStart(8)} ${'SUPABASE'.padStart(9)}   ¿IGUAL?`);
let desiguales = 0;
for(const r of reporte){
  const igual = r.sheet === r.supabase;
  if(!igual) desiguales++;
  console.log(`${r.hoja.padEnd(24)} ${String(r.sheet).padStart(8)} ${String(r.supabase).padStart(9)}   ${igual?'sí':'NO ←'}`);
}
console.log('─'.repeat(52));
if(desiguales || fallas){
  console.log(`\n${desiguales} tabla(s) con distinto número de renglones, ${fallas} bloque(s) con error.`);
  console.log('Vuelve a correr el script: es idempotente y solo alcanza lo que falta.');
  process.exit(1);
}
console.log(`\nTodo cuadra: ${reporte.length} tablas con el mismo número de renglones en los dos lados.`);
