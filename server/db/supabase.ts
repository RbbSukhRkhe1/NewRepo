import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseSchema = {
  public: {
    Tables: {
      users: {
        Row: {
          id: number;
          name: string;
          email: string;
          password_hash: string;
          role: 'admin' | 'donor' | 'beneficiary';
          anvil_index: number | null;
          created_at: string;
        };
      };
      causes: {
        Row: {
          id: number;
          title: string;
          description: string;
          goal_eth: number;
          raised_eth: number;
          active: boolean;
          created_at: string;
        };
      };
      ledger_entries: {
        Row: {
          id: number;
          tx_hash: string;
          block_number: number | null;
          from_addr: string;
          to_addr: string;
          value_eth: string;
          kind: 'donation_in' | 'disbursement_out' | 'chain_sync';
          cause_id: number | null;
          from_display_name: string | null;
          to_display_name: string | null;
          cause_name: string | null;
          recorded_at: string;
        };
      };
    };
  };
};

export function createSupabaseAdminClient(): SupabaseClient<SupabaseSchema> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('[env] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient<SupabaseSchema>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/*
Week 2 schema migration SQL (Postgres / Supabase)

CREATE TABLE IF NOT EXISTS public.users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','donor','beneficiary')),
  anvil_index INTEGER UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.causes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_eth DOUBLE PRECISION NOT NULL,
  raised_eth DOUBLE PRECISION NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tx_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT,
  from_addr TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  value_eth TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('donation_in','disbursement_out','chain_sync')),
  cause_id BIGINT REFERENCES public.causes(id),
  from_display_name TEXT,
  to_display_name TEXT,
  cause_name TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_recorded ON public.ledger_entries(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_anvil ON public.users(anvil_index);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.causes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Example admin-only full read policy (depends on your auth.jwt() role claim strategy)
CREATE POLICY "admins_read_all_users" ON public.users
FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');

-- Example users self-read policy
CREATE POLICY "users_read_self" ON public.users
FOR SELECT USING ((auth.jwt() ->> 'email') = email);

-- Example everyone can read active causes
CREATE POLICY "read_active_causes" ON public.causes
FOR SELECT USING (active = TRUE);

-- Example admins can manage causes
CREATE POLICY "admins_manage_causes" ON public.causes
FOR ALL USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- Example users can only read ledger rows involving their wallet
CREATE POLICY "users_read_own_ledger" ON public.ledger_entries
FOR SELECT USING (
  lower(from_addr) = lower(coalesce(auth.jwt() ->> 'address', ''))
  OR lower(to_addr) = lower(coalesce(auth.jwt() ->> 'address', ''))
);

-- Example admins can read all ledger rows
CREATE POLICY "admins_read_all_ledger" ON public.ledger_entries
FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');
*/
