-- Synthetic only. This writes a pending job; no worker or mail runs in B02.
select public.record_contact_inquiry(
  '{"name":"Synthetic Guest","email":"guest@example.invalid","phone":"","date":"2026-12-15","guests":"8","message":"Synthetic event inquiry for local verification."}'::jsonb,
  '11111111-1111-4111-8111-111111111111'::uuid,
  '{"sender":"Website <sender@example.invalid>","recipient":"staff@example.invalid","reply_to":"guest@example.invalid","subject":"Synthetic inquiry","body":"Synthetic notification. Never deliver this job."}'::jsonb
);
