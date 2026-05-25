-- supabase/migrations/0013_checklist_category.sql
ALTER TABLE event_checklist_items
  ADD COLUMN category text;

ALTER TABLE checklist_template_items
  ADD COLUMN category text;
