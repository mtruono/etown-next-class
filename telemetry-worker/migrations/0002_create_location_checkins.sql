CREATE TABLE IF NOT EXISTS location_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_hash TEXT NOT NULL,
  device_code TEXT NOT NULL CHECK(length(device_code) = 6),
  latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  accuracy_meters REAL NOT NULL CHECK(accuracy_meters BETWEEN 0 AND 5000),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_location_checkins_created_at
  ON location_checkins(created_at);

CREATE INDEX IF NOT EXISTS idx_location_checkins_installation_created_at
  ON location_checkins(installation_hash, created_at DESC);
