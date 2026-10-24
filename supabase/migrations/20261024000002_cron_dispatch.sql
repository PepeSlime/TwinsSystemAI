-- Agendamento periódico do dispatch-schedules via pg_cron e pg_net a cada 5 minutos
SELECT cron.schedule('dispatch-schedules-job', '*/5 * * * *', $$
  SELECT net.http_post(
    url := 'https://pxlpevpneqeqowozfieq.supabase.co/functions/v1/dispatch-schedules',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
