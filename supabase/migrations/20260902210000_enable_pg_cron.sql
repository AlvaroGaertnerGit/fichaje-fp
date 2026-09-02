-- Fichaje FP — habilita pg_cron (Fase 6.2)
--
-- Necesario para poder programar el cierre automático de jornadas dentro
-- de la propia base de datos (nunca Vercel Cron, nunca un scheduler en
-- Next.js) — así la base de datos puede ejecutar el cierre aunque ningún
-- usuario esté usando la aplicación.
--
-- Comandos tomados literalmente de la guía oficial de instalación de
-- Supabase (docs: guides/cron/install) en vez de un simple
-- `create extension if not exists pg_cron`: esa guía instala la extensión
-- explícitamente en `pg_catalog` y concede a `postgres` acceso al esquema
-- `cron` y a sus tablas — necesario porque las migraciones de este
-- proyecto se ejecutan como `postgres` (verificado en vivo:
-- `select current_user` -> postgres) y es también el rol bajo el que
-- correrá el propio job de cron (ver migración de scheduling).

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
