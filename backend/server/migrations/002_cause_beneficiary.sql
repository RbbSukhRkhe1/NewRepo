-- Cause ↔ beneficiary link and impact story fields (consolidated disbursement model).
ALTER TABLE causes ADD COLUMN beneficiary_user_id INTEGER REFERENCES users(id);
ALTER TABLE causes ADD COLUMN impact_story_title TEXT;
ALTER TABLE causes ADD COLUMN impact_story_body TEXT;

CREATE INDEX IF NOT EXISTS idx_causes_beneficiary ON causes(beneficiary_user_id);
