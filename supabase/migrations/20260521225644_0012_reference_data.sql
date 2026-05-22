-- ============================================================
-- 0012_reference_data.sql
-- Production-safe reference data required by the app.
-- Development-only sample data belongs in supabase/seed.sql.
-- ============================================================

insert into dare_categories (id, label, icon, active, sort_order) values
  ('knowledge',  'Knowledge',  'brain', true, 1),
  ('physical',   'Physical',   'dumbbell', true, 2),
  ('verbal',     'Verbal',     'message-circle', true, 3),
  ('sports',     'Sports',     'football', true, 4),
  ('creative',   'Creative',   'palette', true, 5),
  ('other',      'Other',      'zap', true, 6)
on conflict (id) do update set
  label = excluded.label,
  icon = excluded.icon,
  active = excluded.active,
  sort_order = excluded.sort_order;
