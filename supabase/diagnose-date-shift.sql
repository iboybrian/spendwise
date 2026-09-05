-- ============================================================
-- SpendWise · diagnostico de fechas corridas por UTC
--
-- Zona: America/Guatemala = UTC-6 todo el ano (sin horario de verano).
-- El bug: el cliente derivaba la fecha con toISOString(), que serializa
-- en UTC. Despues de las 18:00 locales, UTC ya es el dia siguiente.
--
-- Usuario: c2a112f4-bff3-4a56-827a-121965b8860c
-- ESTE ARCHIVO ES SOLO LECTURA. No modifica nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Panorama general
-- ------------------------------------------------------------
SELECT
  count(*)                                                 AS total_gastos,
  min(date)                                                AS primera_fecha,
  max(date)                                                AS ultima_fecha,
  count(*) FILTER (WHERE recurring_expense_id IS NOT NULL)  AS generados_por_recurrente,
  count(*) FILTER (WHERE recurring_expense_id IS NULL)      AS capturados_a_mano
FROM public.expenses
WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c';


-- ------------------------------------------------------------
-- 2. Gastos manuales cuya fecha NO coincide con el dia local en
--    que se crearon. created_at es timestamptz: guarda el instante
--    real y el bug nunca lo toco, asi que es la fuente de verdad.
--
--    dias_diferencia = +1  -> firma del bug
--    otro valor            -> fecha que pusiste a mano, NO tocar
-- ------------------------------------------------------------
SELECT
  id,
  description,
  amount,
  date                                                           AS fecha_guardada,
  (created_at AT TIME ZONE 'America/Guatemala')::date             AS fecha_real_local,
  to_char(created_at AT TIME ZONE 'America/Guatemala', 'HH24:MI') AS hora_local,
  date - (created_at AT TIME ZONE 'America/Guatemala')::date      AS dias_diferencia
FROM public.expenses
WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c'
  AND recurring_expense_id IS NULL
  AND date <> (created_at AT TIME ZONE 'America/Guatemala')::date
ORDER BY created_at;


-- ------------------------------------------------------------
-- 3. Cuantos calzan con la firma exacta del bug: corridos +1 dia
--    Y capturados despues de las 18:00 locales. Los unicos que se
--    pueden corregir automaticamente sin riesgo.
-- ------------------------------------------------------------
SELECT
  count(*)     AS afectados_por_el_bug,
  sum(amount)  AS monto_total,
  min(date)    AS desde,
  max(date)    AS hasta
FROM public.expenses
WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c'
  AND recurring_expense_id IS NULL
  AND date = (created_at AT TIME ZONE 'America/Guatemala')::date + 1
  AND EXTRACT(hour FROM (created_at AT TIME ZONE 'America/Guatemala')) >= 18;


-- ------------------------------------------------------------
-- 4. Recurrentes. Los creados despues de las 18:00 locales tienen
--    sus entradas diarias corridas +1, pero solo en el mes en que
--    se crearon: desde el mes siguiente el cursor arranca en la
--    medianoche local del dia 1, que si convierte bien a UTC.
-- ------------------------------------------------------------
SELECT
  r.id,
  r.description,
  r.amount,
  r.is_active,
  to_char(r.created_at AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD HH24:MI') AS creado_local,
  EXTRACT(hour FROM (r.created_at AT TIME ZONE 'America/Guatemala')) >= 18     AS creado_de_noche,
  count(e.id)  AS entradas_generadas,
  min(e.date)  AS primera_entrada,
  max(e.date)  AS ultima_entrada
FROM public.recurring_expenses r
LEFT JOIN public.expenses e ON e.recurring_expense_id = r.id
WHERE r.user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c'
GROUP BY r.id, r.description, r.amount, r.is_active, r.created_at
ORDER BY r.created_at;


-- ------------------------------------------------------------
-- 5. Entradas con fecha futura. Inequivocamente malas: el generador
--    corria de noche, calculaba "hoy" como manana, y adelantaba un
--    dia de mas.
-- ------------------------------------------------------------
SELECT id, description, amount, date, recurring_expense_id
FROM public.expenses
WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c'
  AND date > (now() AT TIME ZONE 'America/Guatemala')::date
ORDER BY date;


-- ------------------------------------------------------------
-- 6. Dias duplicados por recurrente. Si el generador escribio dos
--    veces el mismo dia, estarias contando doble.
-- ------------------------------------------------------------
SELECT recurring_expense_id, date, count(*) AS veces, sum(amount) AS total
FROM public.expenses
WHERE user_id = 'c2a112f4-bff3-4a56-827a-121965b8860c'
  AND recurring_expense_id IS NOT NULL
GROUP BY recurring_expense_id, date
HAVING count(*) > 1
ORDER BY date;
