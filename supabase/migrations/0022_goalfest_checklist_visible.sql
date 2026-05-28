-- Make all GoalFest Activo Lounge checklist items visible in client portal
UPDATE event_checklist_items
SET is_client_visible = true
WHERE event_id = '30000000-0000-0000-0000-000000000001';
