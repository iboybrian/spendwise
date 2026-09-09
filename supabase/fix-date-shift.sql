-- ============================================================
-- SpendWise · correccion de fechas corridas por UTC
--
-- Usuario: c2a112f4-bff3-4a56-827a-121965b8860c
-- Zona:    America/Guatemala (UTC-6, sin horario de verano)
--
-- ESTE ARCHIVO SI MODIFICA DATOS.
-- Corre los pasos EN ORDEN. No saltes el paso 0.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 0 · RESPALDO. Obligatorio. Sin esto no hay vuelta atras.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses_backup_20260905 AS
SELECT * FROM public.expenses
WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c';

-- Verifica que copio las 955 filas antes de seguir:
SELECT count(*) AS filas_respaldadas FROM public.expenses_backup_20260905;


-- ------------------------------------------------------------
-- PASO 1 · Corregir los 168 gastos manuales corridos +1 dia.
--
-- El predicado es la firma exacta del bug: fecha guardada un dia
-- adelante del dia local de captura, Y capturado a las 18:00 o
-- despues. El diagnostico confirmo que las 168 filas con fecha
-- discordante calzan todas con esta firma, asi que no hay riesgo
-- de tocar una fecha que hayas escrito a mano.
--
-- Es idempotente: al correrlo de nuevo ya nada calza el predicado.
-- ------------------------------------------------------------
UPDATE public.expenses
SET date = date - 1
WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c'
  AND recurring_expense_id IS NULL
  AND date = (created_at AT TIME ZONE 'America/Guatemala')::date + 1
  AND EXTRACT(hour FROM (created_at AT TIME ZONE 'America/Guatemala')) >= 18;
-- Esperado: UPDATE 168


-- ------------------------------------------------------------
-- PASO 2 · Verificar. Debe devolver 0 filas.
-- ------------------------------------------------------------
SELECT count(*) AS deben_quedar_cero
FROM public.expenses
WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c'
  AND recurring_expense_id IS NULL
  AND date <> (created_at AT TIME ZONE 'America/Guatemala')::date;


-- ------------------------------------------------------------
-- PASO 3 · Duplicados de recurrentes. Primero MIRA que va a borrar.
--          Deben salir 4 filas: Gym 05-25, netflix 05-25,
--          Smartfit 07-07, Smartfit 07-15.
-- ------------------------------------------------------------
SELECT e.id, r.description, e.date, e.amount, e.created_at
FROM public.expenses e
JOIN public.recurring_expenses r ON r.id = e.recurring_expense_id
WHERE e.id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY recurring_expense_id, date
      ORDER BY created_at, id
    ) AS rn
    FROM public.expenses
    WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c'
      AND recurring_expense_id IS NOT NULL
  ) t WHERE rn > 1
)
ORDER BY e.date;


-- ------------------------------------------------------------
-- PASO 4 · Borrar esos duplicados. Conserva el mas antiguo de
--          cada dia. Solo corre esto si el paso 3 mostro las 4
--          filas esperadas y ninguna otra.
-- ------------------------------------------------------------
DELETE FROM public.expenses
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY recurring_expense_id, date
      ORDER BY created_at, id
    ) AS rn
    FROM public.expenses
    WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c'
      AND recurring_expense_id IS NOT NULL
  ) t WHERE rn > 1
);
-- Esperado: DELETE 4


-- ------------------------------------------------------------
-- PASO 5 · Impedir que vuelva a pasar.
--
-- El generador lee que dias existen y luego inserta los faltantes.
-- Entre la lectura y la escritura, otra corrida concurrente puede
-- insertar el mismo dia: por eso los duplicados. Este indice hace
-- imposible el doble cobro a nivel de base de datos.
--
-- NO lo hagas parcial. Un `WHERE recurring_expense_id IS NOT NULL`
-- sobra (los NULL se comparan como distintos, asi que los gastos
-- manuales ya pueden repetirse el mismo dia) y ademas rompe la app:
-- PostgREST emite un ON CONFLICT (recurring_expense_id, date) pelado,
-- que Postgres no puede casar contra un indice parcial, y falla cada
-- insert de recurrente con 42P10.
--
-- Falla si todavia hay duplicados. Corre el paso 4 primero.
-- ------------------------------------------------------------
DROP INDEX IF EXISTS public.expenses_recurring_day_uniq;

CREATE UNIQUE INDEX expenses_recurring_day_uniq
  ON public.expenses (recurring_expense_id, date);


-- ------------------------------------------------------------
-- PASO 6 · OPCIONAL. Smartfit y Mama se crearon el 2026-05-28
--          pasadas las 20:00, asi que su primer dia quedo como
--          05-29 y mayo perdio un dia de cobro en ambos.
--          Esto agrega el dia faltante. Mayo tiene 31 dias:
--            Smartfit 215/31 = 6.94    Mama 1000/31 = 32.26
--
--          Impacto total: Q39.20. Si no te importa, saltalo.
-- ------------------------------------------------------------
-- INSERT INTO public.expenses
--   (user_id, amount, description, category, category_confidence, date, recurring_expense_id)
-- VALUES
--   ('c2a112f4-bff3-4a56-827a-121965b8860c',  6.94, 'Smartfit', 'Home', 1, '2026-05-28', '38067c0f-446f-4cb5-8f9b-6f1dfe0df644'),
--   ('c2a112f4-bff3-4a56-827a-121965b8860c', 32.26, 'Mama',     'Home', 1, '2026-05-28', '27690c2f-11b3-4401-a843-1fce91af053b');


-- ------------------------------------------------------------
-- REVERTIR TODO, si algo sale mal:
-- ------------------------------------------------------------
-- BEGIN;
--   DELETE FROM public.expenses
--    WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c';
--   INSERT INTO public.expenses
--   SELECT * FROM public.expenses_backup_20260905;
-- COMMIT;
-- (Si el indice del paso 5 estorba al restaurar:
--    DROP INDEX IF EXISTS public.expenses_recurring_day_uniq;)


-- ------------------------------------------------------------
-- LIMPIEZA, cuando ya confirmaste que todo quedo bien:
-- ------------------------------------------------------------
-- DROP TABLE public.expenses_backup_20260905;
--
-- El RPC get_expense_summary ya no lo llama nadie: la app calcula
-- los totales en el cliente desde el commit cf4dd91.
-- DROP FUNCTION IF EXISTS public.get_expense_summary(date, date);
