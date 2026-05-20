-- Ledger v2 migration
-- Adds richer traceability + search fields while keeping v1 rows valid.

PRAGMA foreign_keys = ON;

-- New optional columns (v1-compatible).
-- This migration is applied once via schema_migrations.
ALTER TABLE ledger_entries ADD COLUMN tags TEXT;                -- JSON text array, e.g. ["urgent","medical"]
ALTER TABLE ledger_entries ADD COLUMN reference TEXT;           -- human reference, unique when present
ALTER TABLE ledger_entries ADD COLUMN narrative TEXT;           -- rich human-centric description
ALTER TABLE ledger_entries ADD COLUMN linked_tx_ids TEXT;       -- JSON text array of ledger_entries.id (strings) or tx_hashes
ALTER TABLE ledger_entries ADD COLUMN aggregated_from TEXT;     -- JSON: donor initials + amounts used to aggregate a disbursement

-- Reference uniqueness (allow multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_reference_unique
  ON ledger_entries(reference)
  WHERE reference IS NOT NULL AND reference <> '';

CREATE INDEX IF NOT EXISTS idx_ledger_cause_kind_time
  ON ledger_entries(cause_id, kind, recorded_at DESC);

-- Full-text search over narrative/reference/tags/cause_name/from/to.
-- Uses external content table so we can keep ledger_entries as source of truth.
CREATE VIRTUAL TABLE IF NOT EXISTS ledger_entries_fts
  USING fts5(
    narrative,
    reference,
    tags,
    cause_name,
    from_display_name,
    to_display_name,
    tx_hash,
    content='ledger_entries',
    content_rowid='id'
  );

-- Triggers to keep FTS in sync.
CREATE TRIGGER IF NOT EXISTS ledger_entries_ai
AFTER INSERT ON ledger_entries
BEGIN
  INSERT INTO ledger_entries_fts(rowid, narrative, reference, tags, cause_name, from_display_name, to_display_name, tx_hash)
  VALUES (new.id, COALESCE(new.narrative,''), COALESCE(new.reference,''), COALESCE(new.tags,''), COALESCE(new.cause_name,''), COALESCE(new.from_display_name,''), COALESCE(new.to_display_name,''), COALESCE(new.tx_hash,''));
END;

CREATE TRIGGER IF NOT EXISTS ledger_entries_ad
AFTER DELETE ON ledger_entries
BEGIN
  INSERT INTO ledger_entries_fts(ledger_entries_fts, rowid, narrative, reference, tags, cause_name, from_display_name, to_display_name, tx_hash)
  VALUES('delete', old.id, '', '', '', '', '', '', '');
END;

CREATE TRIGGER IF NOT EXISTS ledger_entries_au
AFTER UPDATE ON ledger_entries
BEGIN
  INSERT INTO ledger_entries_fts(ledger_entries_fts, rowid, narrative, reference, tags, cause_name, from_display_name, to_display_name, tx_hash)
  VALUES('delete', old.id, '', '', '', '', '', '', '');
  INSERT INTO ledger_entries_fts(rowid, narrative, reference, tags, cause_name, from_display_name, to_display_name, tx_hash)
  VALUES (new.id, COALESCE(new.narrative,''), COALESCE(new.reference,''), COALESCE(new.tags,''), COALESCE(new.cause_name,''), COALESCE(new.from_display_name,''), COALESCE(new.to_display_name,''), COALESCE(new.tx_hash,''));
END;

-- Backfill FTS once (safe to run repeatedly because it uses INSERT OR REPLACE into rowid)
INSERT INTO ledger_entries_fts(rowid, narrative, reference, tags, cause_name, from_display_name, to_display_name, tx_hash)
SELECT
  id,
  COALESCE(narrative,''),
  COALESCE(reference,''),
  COALESCE(tags,''),
  COALESCE(cause_name,''),
  COALESCE(from_display_name,''),
  COALESCE(to_display_name,''),
  COALESCE(tx_hash,'')
FROM ledger_entries
WHERE id NOT IN (SELECT rowid FROM ledger_entries_fts);

