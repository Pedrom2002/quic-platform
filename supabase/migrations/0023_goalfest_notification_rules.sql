-- Set email + sms + portal on_complete notifications for all GoalFest Activo Lounge checklist items
UPDATE event_checklist_items
SET notification_rules = '[{"trigger":"on_complete","delay_minutes":0,"audience":"all_clients","channels":["email","sms","portal"],"language":"pt"}]'::jsonb
WHERE event_id = '30000000-0000-0000-0000-000000000001';
