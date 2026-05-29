-- Copy Activo Lounge template items to GoalFest event checklist
INSERT INTO event_checklist_items (
  event_id,
  template_item_id,
  title,
  position,
  category,
  is_client_visible,
  status,
  notification_rules
)
SELECT
  '30000000-0000-0000-0000-000000000001',
  cti.id,
  cti.title,
  cti.position,
  cti.category,
  cti.is_client_visible,
  'pending',
  cti.default_notification_rules
FROM checklist_template_items cti
WHERE cti.template_id = '20000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;
