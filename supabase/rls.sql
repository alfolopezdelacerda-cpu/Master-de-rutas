-- Políticas de acceso · ETAPA 1
--
-- IMPORTANTE, y hay que decirlo claro: esta etapa NO mejora la seguridad.
-- Deja el acceso exactamente igual de abierto que el Apps Script de hoy —
-- cualquiera con la llave anónima puede leer y escribir—, para que el cambio
-- de piso sea un cambio de piso y nada más. Si algo se rompe en la migración,
-- se sabe que fue la migración.
--
-- El cierre de verdad —Supabase Auth, un usuario real por persona, y permisos
-- por rol y por cartera— es la ETAPA 2, en supabase/rls-fase2.sql. Hasta que
-- esa etapa esté aplicada, la plataforma sigue siendo tan abierta como hoy:
-- no la publiques en una URL que no controles.

-- RLS se prende en todas las tablas desde ahora, aunque las políticas sean
-- permisivas. Así, cuando llegue la etapa 2, solo hay que cambiar políticas y
-- no queda ninguna tabla olvidada sin protección.

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> 'auditoria'
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists abierto_etapa1 on %I', t);
    execute format(
      'create policy abierto_etapa1 on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- La auditoría es la excepción desde el primer día: se puede leer, pero nadie
-- la escribe ni la corrige a mano. Solo el trigger, que corre como definer.
alter table auditoria enable row level security;
drop policy if exists auditoria_leer on auditoria;
create policy auditoria_leer on auditoria for select to anon, authenticated using (true);
-- Sin política de insert/update/delete: quedan prohibidos para todos.
