ALTER TABLE events ADD COLUMN device_code TEXT
  CHECK(device_code IS NULL OR length(device_code) = 6);

PRAGMA optimize;
