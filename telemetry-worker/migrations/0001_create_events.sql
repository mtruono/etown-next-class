CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL CHECK (event_name IN (
    'app_open',
    'take_me_to_class_tapped',
    'take_me_home_tapped',
    'map_launch_attempted',
    'location_permission_denied',
    'location_timeout',
    'location_unavailable',
    'setup_imported',
    'telemetry_disabled'
  )),
  installation_hash TEXT NOT NULL,
  target TEXT CHECK (target IN ('class', 'home')),
  provider TEXT CHECK (provider IN ('concept3d', 'apple', 'google')),
  app_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_name_created_at ON events(event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_events_installation ON events(installation_hash);
