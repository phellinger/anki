ALTER TABLE deck_settings
ADD COLUMN IF NOT EXISTS skip_easy BOOLEAN DEFAULT false; 