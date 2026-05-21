import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { resolveSessionSecret, sessionCookieSecure } from './session.js';
import bcrypt from 'bcryptjs';
import { ethers } from 'ethers';
import { db } from './db.js';
import {
  SUPER_RICH_INDEX,
  connectWallet,
  anvilAddress,
} from './anvil.js';
import { getRpcHttpUrl, chainId, network } from './config.js';
import { maskAddr } from './resolve.js';
import { publishEvent } from './lib/redis.js';
import { ensureCauseWallets, nextCauseAnvilIndex } from './causeWallets.js';
import {
  buildNarrative,
  causeUtilizationByCauseId,
  computeAndStoreDisbursementAggregation,
  ledgerReference,
  parseAggregatedFrom,
  searchLedgerV2,
  type LedgerKind,
} from './ledger/LedgerService.js';

const vaultLower = () => anvilAddress(SUPER_RICH_INDEX).toLowerCase();

function rpcProvider() {
  return new ethers.JsonRpcProvider(getRpcHttpUrl());
}

/** On-chain balance; returns null when JSON-RPC is unreachable (Anvil not running, etc.). */
async function tryGetBalanceEth(address: string): Promise<string | null> {
  try {
    const bal = await rpcProvider().getBalance(address);
    return ethers.formatEther(bal);
  } catch (e: unknown) {
    console.warn('[rpc] getBalance failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

function parseOptionalImageUrl(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw == null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (!s) return { ok: true, value: null };
  if (s.startsWith('/')) {
    if (s.length > 512 || s.includes('..') || /[\s<>"'`]/.test(s)) {
      return { ok: false, error: 'Invalid image path' };
    }
    if (!/^\/[\w./-]+\.[A-Za-z0-9]+$/i.test(s)) {
      return { ok: false, error: 'image path must look like /folder/file.jpg' };
    }
    return { ok: true, value: s };
  }
  let candidate = s;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return { ok: false, error: 'Invalid imageUrl' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'imageUrl must use http or https, or a path starting with /' };
  }
  return { ok: true, value: u.href };
}

type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  anvil_index: number | null;
};

type LedgerDbRow = {
  id: number;
  tx_hash: string;
  from_addr: string;
  to_addr: string;
  value_eth: string;
  kind: string;
  cause_name: string | null;
  memo: string | null;
  from_display_name: string | null;
  to_display_name: string | null;
  recorded_at: string;
};

function parseDisburseMessage(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw == null || raw === '') return { ok: true, value: null };
  const s = String(raw).trim();
  if (!s) return { ok: true, value: null };
  if (s.length > 40) return { ok: false, error: 'Message must be at most 40 characters' };
  return { ok: true, value: s };
}

function disbursedEthByCauseId(): Map<number, number> {
  const rows = db
    .prepare(
      `SELECT cause_id, COALESCE(SUM(CAST(value_eth AS REAL)), 0) AS total
       FROM ledger_entries
       WHERE kind = 'disbursement_out' AND cause_id IS NOT NULL
       GROUP BY cause_id`
    )
    .all() as { cause_id: number; total: number }[];
  return new Map(rows.map((r) => [r.cause_id, Number(r.total) || 0]));
}

function attachDisbursedEth<T extends { id: number }>(row: T, map: Map<number, number>) {
  return { ...row, disbursed_eth: map.get(row.id) ?? 0 };
}

function mapLedgerRowToApi(r: LedgerDbRow, vaultLowerStr: string) {
  let kind: 'donation_in' | 'disbursement_out' = 'donation_in';
  if (r.kind === 'disbursement_out') kind = 'disbursement_out';
  else if (r.kind === 'donation_in') kind = 'donation_in';
  else if (r.kind === 'chain_sync') {
    const to = r.to_addr.toLowerCase();
    const from = r.from_addr.toLowerCase();
    if (to === vaultLowerStr) kind = 'donation_in';
    else if (from === vaultLowerStr) kind = 'disbursement_out';
    else kind = 'donation_in';
  }

  const fromName = r.from_display_name ?? maskAddr(r.from_addr);
  const toName = r.to_display_name ?? maskAddr(r.to_addr);

  return {
    id: String(r.id),
    kind,
    fromDisplayName: fromName,
    fromMasked: maskAddr(r.from_addr),
    toDisplayName: toName,
    toMasked: maskAddr(r.to_addr),
    amountEth: r.value_eth,
    causeName: r.cause_name ?? '',
    memo: r.memo ?? '',
    txHash: r.tx_hash,
    recordedAt: new Date(r.recorded_at + 'Z').toISOString(),
  };
}

function getUser(req: express.Request): UserRow | undefined {
  const id = req.session?.userId;
  if (id == null) return undefined;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!getUser(req)) return res.status(401).json({ error: 'Sign in required' });
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const u = getUser(req);
  if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

export function createApp() {
  const app = express();
  // Behind nginx: correct client IP and optional X-Forwarded-Proto for cookies / redirects.
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '512kb' }));
  app.use(
    cookieSession({
      name: 'session',
      keys: [resolveSessionSecret()],
      maxAge: 7 * 24 * 3600 * 1000,
      sameSite: 'lax',
      httpOnly: true,
      secure: sessionCookieSecure(),
    }) as express.RequestHandler
  );

  const api = express.Router();
  api.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  api.use(
    '/auth/login',
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many login attempts — try again later' },
    })
  );

  api.get('/config', (_req, res) => {
    res.json({
      superRichAddress: anvilAddress(SUPER_RICH_INDEX),
      superRichMasked: maskAddr(anvilAddress(SUPER_RICH_INDEX)),
      network,
      chainId,
    });
  });

  api.get('/overview', async (_req, res) => {
    const causesAgg = db
      .prepare(
        `SELECT
          COUNT(*) AS active_causes,
          COALESCE(SUM(raised_eth), 0) AS total_raised_eth
         FROM causes
         WHERE active = 1`
      )
      .get() as { active_causes: number; total_raised_eth: number };

    const ledgerAgg = db
      .prepare(
        `SELECT
          COUNT(*) AS ledger_entries,
          COALESCE(SUM(CASE WHEN kind = 'donation_in' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS total_donated_eth,
          COALESCE(SUM(CASE WHEN kind = 'disbursement_out' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS total_disbursed_eth
         FROM ledger_entries`
      )
      .get() as { ledger_entries: number; total_donated_eth: number; total_disbursed_eth: number };

    try {
      const provider = rpcProvider();
      const vaultAddr = anvilAddress(SUPER_RICH_INDEX);
      const bal = await provider.getBalance(vaultAddr);

      res.json({
        vault: {
          addressMasked: maskAddr(vaultAddr),
          balanceEth: ethers.formatEther(bal),
        },
        stats: {
          activeCauses: Number(causesAgg.active_causes) || 0,
          ledgerEntries: Number(ledgerAgg.ledger_entries) || 0,
          totalRaisedEth: Number(causesAgg.total_raised_eth) || 0,
          totalDonatedEth: Number(ledgerAgg.total_donated_eth) || 0,
          totalDisbursedEth: Number(ledgerAgg.total_disbursed_eth) || 0,
        },
      });
    } catch (e: unknown) {
      console.error(e);
      res.json({
        vault: {
          addressMasked: maskAddr(anvilAddress(SUPER_RICH_INDEX)),
          balanceEth: null,
        },
        stats: {
          activeCauses: Number(causesAgg.active_causes) || 0,
          ledgerEntries: Number(ledgerAgg.ledger_entries) || 0,
          totalRaisedEth: Number(causesAgg.total_raised_eth) || 0,
          totalDonatedEth: Number(ledgerAgg.total_donated_eth) || 0,
          totalDisbursedEth: Number(ledgerAgg.total_disbursed_eth) || 0,
        },
      });
    }
  });

  api.post('/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as
      | UserRow
      | undefined;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session!.userId = user.id;
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        anvilIndex: user.anvil_index,
        address: user.anvil_index != null ? anvilAddress(user.anvil_index) : null,
        addressMasked: user.anvil_index != null ? maskAddr(anvilAddress(user.anvil_index)) : null,
      },
    });
  });

  api.post('/auth/logout', (req, res) => {
    req.session = null;
    res.json({ ok: true });
  });

  api.post('/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'name, email, and password required' });
    }
    if (role !== 'donor' && role !== 'beneficiary') {
      return res.status(400).json({ error: 'role must be donor or beneficiary' });
    }
    const em = email.trim().toLowerCase();
    const hash = bcrypt.hashSync(password.trim(), 10);

    const usedRows = db
      .prepare('SELECT anvil_index FROM users WHERE anvil_index IS NOT NULL')
      .all() as { anvil_index: number }[];
    const usedSet = new Set(usedRows.map((r) => r.anvil_index));
    let nextIdx = 10;
    while (usedSet.has(nextIdx)) nextIdx++;

    try {
      const r = db
        .prepare(
          `INSERT INTO users (name, email, password_hash, role, anvil_index) VALUES (?,?,?,?,?)`
        )
        .run(name.trim(), em, hash, role, nextIdx);
      const id = Number(r.lastInsertRowid);

      const provider = rpcProvider();
      const signer = connectWallet(SUPER_RICH_INDEX, provider);
      const to = anvilAddress(nextIdx);
      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther('100'),
      });
      await tx.wait();

      res.status(201).json({
        id,
        name: name.trim(),
        email: em,
        role,
        anvilIndex: nextIdx,
        address: to,
        fundTxHash: tx.hash,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      if (String(msg).includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
      console.error(e);
      res.status(500).json({ error: msg });
    }
  });

  api.get('/auth/me', (req, res) => {
    const u = getUser(req);
    if (!u) return res.json({ user: null });
    res.json({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        anvilIndex: u.anvil_index,
        address: u.anvil_index != null ? anvilAddress(u.anvil_index) : null,
        addressMasked: u.anvil_index != null ? maskAddr(anvilAddress(u.anvil_index)) : null,
      },
    });
  });

  api.get('/users', requireAuth, requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT id, name, email, role, anvil_index, created_at FROM users ORDER BY id').all() as UserRow[];
    res.json(
      rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        anvilIndex: u.anvil_index,
        address: u.anvil_index != null ? anvilAddress(u.anvil_index) : null,
        addressMasked: u.anvil_index != null ? maskAddr(anvilAddress(u.anvil_index)) : null,
        createdAt: (u as { created_at?: string }).created_at,
      }))
    );
  });


  api.get('/causes/:id', (req, res) => {
    const row = db
      .prepare(`SELECT * FROM causes WHERE id = ? AND active = 1`)
      .get(req.params.id) as
      | {
          id: number;
          title: string;
          description: string;
          goal_eth: number;
          raised_eth: number;
          image_url: string | null;
          created_at: string;
        }
      | undefined;
    if (!row) return res.status(404).json({ error: 'Cause not found' });
    const disbursedMap = disbursedEthByCauseId();
    const utilMap = causeUtilizationByCauseId();
    const base = attachDisbursedEth(row, disbursedMap);
    const util = utilMap.get(row.id);
    res.json({
      ...base,
      donated_eth: util?.donatedEth ?? Number(row.raised_eth) ?? 0,
      disbursed_eth: util?.disbursedEth ?? base.disbursed_eth ?? 0,
      remaining_eth:
        util?.remainingEth ??
        Math.max(0, (Number(row.raised_eth) ?? 0) - (base.disbursed_eth ?? 0)),
      utilization_pct:
        util?.utilizationPct ??
        (Number(row.raised_eth) > 0
          ? Math.min(100, ((base.disbursed_eth ?? 0) / Number(row.raised_eth)) * 100)
          : 0),
      funds_matched: util != null && util.disbursedEth > 0,
    });
  });

  api.get('/causes', (req, res) => {
    const statusRaw = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : '';
    const status = statusRaw === 'completed' || statusRaw === 'active' ? statusRaw : '';
    const rows = db
      .prepare(`SELECT * FROM causes WHERE active = 1 ORDER BY id DESC`)
      .all() as {
      id: number;
      title: string;
      description: string;
      goal_eth: number;
      raised_eth: number;
      image_url: string | null;
      created_at: string;
    }[];
    const disbursedMap = disbursedEthByCauseId();
    const utilMap = causeUtilizationByCauseId();
    const rowsWithUtil = rows.map((row) => {
      const base = attachDisbursedEth(row, disbursedMap);
      const util = utilMap.get(row.id);
      return {
        ...base,
        donated_eth: util?.donatedEth ?? Number(row.raised_eth) ?? 0,
        disbursed_eth: util?.disbursedEth ?? base.disbursed_eth ?? 0,
        remaining_eth: util?.remainingEth ?? Math.max(0, (Number(row.raised_eth) ?? 0) - (base.disbursed_eth ?? 0)),
        utilization_pct:
          util?.utilizationPct ??
          (Number(row.raised_eth) > 0 ? Math.min(100, ((base.disbursed_eth ?? 0) / Number(row.raised_eth)) * 100) : 0),
        funds_matched: util != null && util.disbursedEth > 0,
      };
    });
    const filtered =
      status === 'completed'
        ? rowsWithUtil.filter((row) => row.goal_eth > 0 && row.raised_eth >= row.goal_eth)
        : status === 'active'
          ? rowsWithUtil.filter((row) => row.goal_eth <= 0 || row.raised_eth < row.goal_eth)
          : rowsWithUtil;
    res.json(filtered);
  });

  api.post('/causes', requireAuth, requireAdmin, (req, res) => {
    const { title, description, goalEth, imageUrl } = req.body as {
      title?: string;
      description?: string;
      goalEth?: number;
      imageUrl?: string | null;
    };
    if (!title?.trim() || !description?.trim() || goalEth == null || goalEth <= 0) {
      return res.status(400).json({ error: 'title, description, goalEth (>0) required' });
    }
    const img = parseOptionalImageUrl(imageUrl);
    if (!img.ok) return res.status(400).json({ error: img.error });
    const r = db
      .prepare(
        `INSERT INTO causes (title, description, goal_eth, raised_eth, image_url, active, anvil_index) VALUES (?,?,?,?,?,1,?)`
      )
      .run(title.trim(), description.trim(), goalEth, 0, img.value, nextCauseAnvilIndex());
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  });

  api.get('/admin/causes', requireAuth, requireAdmin, (_req, res) => {
    const rows = db
      .prepare(`SELECT * FROM causes ORDER BY id DESC`)
      .all() as {
      id: number;
      title: string;
      description: string;
      goal_eth: number;
      raised_eth: number;
      image_url: string | null;
      active: number;
      created_at: string;
    }[];
    const disbursedMap = disbursedEthByCauseId();
    res.json(rows.map((row) => attachDisbursedEth(row, disbursedMap)));
  });

  api.get('/admin/causes/:id', requireAuth, requireAdmin, (req, res) => {
    const row = db.prepare(`SELECT * FROM causes WHERE id = ?`).get(req.params.id) as
      | {
          id: number;
          title: string;
          description: string;
          goal_eth: number;
          raised_eth: number;
          image_url: string | null;
          active: number;
          created_at: string;
        }
      | undefined;
    if (!row) return res.status(404).json({ error: 'Cause not found' });
    const disbursedMap = disbursedEthByCauseId();
    res.json(attachDisbursedEth(row, disbursedMap));
  });

  api.put('/causes/:id', requireAuth, requireAdmin, (req, res) => {
    const { title, description, goalEth, imageUrl } = req.body as {
      title?: string;
      description?: string;
      goalEth?: number;
      imageUrl?: string | null;
    };
    if (!title?.trim() || !description?.trim() || goalEth == null || goalEth <= 0) {
      return res.status(400).json({ error: 'title, description, goalEth (>0) required' });
    }
    const img = parseOptionalImageUrl(imageUrl);
    if (!img.ok) return res.status(400).json({ error: img.error });
    const existing = db.prepare(`SELECT id FROM causes WHERE id = ?`).get(req.params.id) as
      | { id: number }
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Cause not found' });
    db.prepare(
      `UPDATE causes SET title = ?, description = ?, goal_eth = ?, image_url = ? WHERE id = ?`
    ).run(title.trim(), description.trim(), goalEth, img.value, req.params.id);
    res.json({ id: Number(req.params.id) });
  });

  api.delete('/causes/:id', requireAuth, requireAdmin, (req, res) => {
    const existing = db.prepare(`SELECT id FROM causes WHERE id = ?`).get(req.params.id) as
      | { id: number }
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Cause not found' });
    db.prepare(`UPDATE causes SET active = 0 WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  });

  api.patch('/causes/:id/active', requireAuth, requireAdmin, (req, res) => {
    const { active } = req.body as { active?: boolean };
    if (active !== true && active !== false) {
      return res.status(400).json({ error: 'active (boolean) required' });
    }
    const existing = db.prepare(`SELECT id FROM causes WHERE id = ?`).get(req.params.id) as
      | { id: number }
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Cause not found' });
    db.prepare(`UPDATE causes SET active = ? WHERE id = ?`).run(active ? 1 : 0, req.params.id);
    res.json({ id: Number(req.params.id), active: active ? 1 : 0 });
  });

  api.post('/donate', requireAuth, async (req, res) => {
    const u = getUser(req)!;
    if (u.anvil_index == null) {
      return res.status(400).json({ error: 'Your account has no Anvil wallet assigned' });
    }
    const { causeId, amountEth } = req.body as { causeId?: number; amountEth?: string };
    if (causeId == null || !amountEth) {
      return res.status(400).json({ error: 'causeId and amountEth required' });
    }
    const cause = db.prepare('SELECT * FROM causes WHERE id = ? AND active = 1').get(causeId) as
      | { id: number; title: string; raised_eth: number; goal_eth: number }
      | undefined;
    if (!cause) return res.status(404).json({ error: 'Cause not found' });
    let value: bigint;
    try {
      value = ethers.parseEther(String(amountEth));
    } catch {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (value <= 0n) return res.status(400).json({ error: 'Amount must be positive' });

    try {
      const provider = rpcProvider();
      const signer = connectWallet(u.anvil_index, provider);
      const tx = await signer.sendTransaction({
        to: anvilAddress(SUPER_RICH_INDEX),
        value,
      });
      const receipt = await tx.wait();
      const valueEthStr = ethers.formatEther(value);
      const reference = ledgerReference('donation_in', tx.hash);
      const narrative = buildNarrative({
        kind: 'donation_in',
        fromDisplay: u.name,
        toDisplay: 'Vaultex',
        amountEth: valueEthStr,
        causeName: cause.title,
        utilization: null,
        memo: null,
      });
      db.prepare(
        `INSERT INTO ledger_entries (
          tx_hash, block_number, from_addr, to_addr, value_eth, kind,
          cause_id, from_display_name, to_display_name, cause_name, memo,
          reference, narrative, tags, linked_tx_ids, aggregated_from
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(tx_hash) DO UPDATE SET
          block_number = excluded.block_number,
          from_addr = excluded.from_addr,
          to_addr = excluded.to_addr,
          value_eth = excluded.value_eth,
          kind = excluded.kind,
          cause_id = excluded.cause_id,
          from_display_name = excluded.from_display_name,
          to_display_name = excluded.to_display_name,
          cause_name = excluded.cause_name,
          memo = excluded.memo,
          reference = excluded.reference,
          narrative = excluded.narrative,
          tags = excluded.tags,
          linked_tx_ids = excluded.linked_tx_ids,
          aggregated_from = excluded.aggregated_from`
      ).run(
        tx.hash,
        receipt?.blockNumber ?? null,
        signer.address,
        anvilAddress(SUPER_RICH_INDEX),
        valueEthStr,
        'donation_in',
        cause.id,
        u.name,
        'Vaultex',
        cause.title,
        null,
        reference,
        narrative,
        JSON.stringify(['donation']),
        null,
        null
      );
      db.prepare(`UPDATE causes SET raised_eth = raised_eth + ? WHERE id = ?`).run(
        parseFloat(valueEthStr),
        cause.id
      );
      void publishEvent('donation.created', {
        txHash: tx.hash,
        amountEth: valueEthStr,
        causeId: cause.id,
        userId: u.id,
      });
      res.json({ txHash: tx.hash, amountEth: valueEthStr, causeId: cause.id });
    } catch (e: unknown) {
      console.error(e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Donation failed' });
    }
  });

  api.post('/causes/:id/disburse', requireAuth, requireAdmin, async (req, res) => {
    const cause = db
      .prepare(`SELECT id, title, anvil_index FROM causes WHERE id = ? AND active = 1`)
      .get(req.params.id) as { id: number; title: string; anvil_index: number | null } | undefined;
    if (!cause) return res.status(404).json({ error: 'Cause not found' });
    if (cause.anvil_index == null) {
      ensureCauseWallets();
      const refreshed = db
        .prepare(`SELECT id, title, anvil_index FROM causes WHERE id = ?`)
        .get(req.params.id) as { id: number; title: string; anvil_index: number | null };
      if (refreshed.anvil_index == null) {
        return res.status(500).json({ error: 'Cause wallet not configured' });
      }
      cause.anvil_index = refreshed.anvil_index;
    }

    const { amountEth, message } = req.body as { amountEth?: string; message?: string };
    if (!amountEth) return res.status(400).json({ error: 'amountEth required' });
    const msgParsed = parseDisburseMessage(message);
    if (!msgParsed.ok) return res.status(400).json({ error: msgParsed.error });

    let value: bigint;
    try {
      value = ethers.parseEther(String(amountEth));
    } catch {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (value <= 0n) return res.status(400).json({ error: 'Amount must be positive' });

    try {
      const provider = rpcProvider();
      const signer = connectWallet(SUPER_RICH_INDEX, provider);
      const to = anvilAddress(cause.anvil_index);
      const tx = await signer.sendTransaction({ to, value });
      const receipt = await tx.wait();
      const valueEthStr = ethers.formatEther(value);
      const reference = ledgerReference('disbursement_out', tx.hash);
      const narrative = buildNarrative({
        kind: 'disbursement_out',
        fromDisplay: 'Vaultex',
        toDisplay: cause.title,
        amountEth: valueEthStr,
        causeName: cause.title,
        utilization: null,
        memo: msgParsed.value,
      });
      db.prepare(
        `INSERT INTO ledger_entries (
          tx_hash, block_number, from_addr, to_addr, value_eth, kind,
          cause_id, from_display_name, to_display_name, cause_name, memo,
          reference, narrative, tags, linked_tx_ids, aggregated_from
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(tx_hash) DO UPDATE SET
          block_number = excluded.block_number,
          from_addr = excluded.from_addr,
          to_addr = excluded.to_addr,
          value_eth = excluded.value_eth,
          kind = excluded.kind,
          cause_id = excluded.cause_id,
          from_display_name = excluded.from_display_name,
          to_display_name = excluded.to_display_name,
          cause_name = excluded.cause_name,
          memo = excluded.memo,
          reference = excluded.reference,
          narrative = excluded.narrative,
          tags = excluded.tags,
          linked_tx_ids = excluded.linked_tx_ids,
          aggregated_from = excluded.aggregated_from`
      ).run(
        tx.hash,
        receipt?.blockNumber ?? null,
        signer.address,
        to,
        valueEthStr,
        'disbursement_out',
        cause.id,
        'Vaultex',
        cause.title,
        cause.title,
        msgParsed.value,
        reference,
        narrative,
        JSON.stringify(['disbursement']),
        null,
        null
      );
      const leRow = db.prepare(`SELECT id FROM ledger_entries WHERE tx_hash = ?`).get(tx.hash) as
        | { id: number }
        | undefined;
      if (leRow?.id != null) {
        computeAndStoreDisbursementAggregation({
          ledgerEntryId: leRow.id,
          txHash: tx.hash,
          causeId: cause.id,
          amountEth: valueEthStr,
        });
      }
      void publishEvent('disbursement.created', {
        txHash: tx.hash,
        amountEth: valueEthStr,
        causeId: cause.id,
        causeName: cause.title,
      });
      res.json({ txHash: tx.hash, amountEth: valueEthStr, causeId: cause.id });
    } catch (e: unknown) {
      console.error(e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Cause disbursement failed' });
    }
  });

  api.post('/disburse', requireAuth, requireAdmin, async (req, res) => {
    const { beneficiaryUserId, amountEth, causeId, causeName, message } = req.body as {
      beneficiaryUserId?: number;
      amountEth?: string;
      causeId?: number;
      causeName?: string;
      message?: string;
    };
    if (beneficiaryUserId == null || !amountEth) {
      return res.status(400).json({ error: 'beneficiaryUserId and amountEth required' });
    }
    const msgParsed = parseDisburseMessage(message);
    if (!msgParsed.ok) return res.status(400).json({ error: msgParsed.error });
    const beneficiary = db
      .prepare(`SELECT * FROM users WHERE id = ? AND role = 'beneficiary'`)
      .get(beneficiaryUserId) as UserRow | undefined;
    if (!beneficiary?.anvil_index) return res.status(404).json({ error: 'Beneficiary user not found' });

    let causeRow: { id: number; title: string } | undefined;
    if (causeId != null) {
      causeRow = db
        .prepare(`SELECT id, title FROM causes WHERE id = ? AND active = 1`)
        .get(causeId) as { id: number; title: string } | undefined;
      if (!causeRow) return res.status(404).json({ error: 'Cause not found' });
    }

    let value: bigint;
    try {
      value = ethers.parseEther(String(amountEth));
    } catch {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    try {
      const provider = rpcProvider();
      const signer = connectWallet(SUPER_RICH_INDEX, provider);
      const to = anvilAddress(beneficiary.anvil_index);
      const tx = await signer.sendTransaction({ to, value });
      const receipt = await tx.wait();
      const valueEthStr = ethers.formatEther(value);
      const cn = causeRow?.title ?? (causeName?.trim() || 'General allocation');
      const cid = causeRow?.id ?? null;
      const reference = ledgerReference('disbursement_out', tx.hash);
      const narrative = buildNarrative({
        kind: 'disbursement_out',
        fromDisplay: 'Vaultex',
        toDisplay: beneficiary.name,
        amountEth: valueEthStr,
        causeName: cn,
        utilization: null,
        memo: msgParsed.value,
      });
      db.prepare(
        `INSERT INTO ledger_entries (
          tx_hash, block_number, from_addr, to_addr, value_eth, kind,
          cause_id, from_display_name, to_display_name, cause_name, memo,
          reference, narrative, tags, linked_tx_ids, aggregated_from
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(tx_hash) DO UPDATE SET
          block_number = excluded.block_number,
          from_addr = excluded.from_addr,
          to_addr = excluded.to_addr,
          value_eth = excluded.value_eth,
          kind = excluded.kind,
          cause_id = excluded.cause_id,
          from_display_name = excluded.from_display_name,
          to_display_name = excluded.to_display_name,
          cause_name = excluded.cause_name,
          memo = excluded.memo,
          reference = excluded.reference,
          narrative = excluded.narrative,
          tags = excluded.tags,
          linked_tx_ids = excluded.linked_tx_ids,
          aggregated_from = excluded.aggregated_from`
      ).run(
        tx.hash,
        receipt?.blockNumber ?? null,
        signer.address,
        to,
        valueEthStr,
        'disbursement_out',
        cid,
        'Vaultex',
        beneficiary.name,
        cn,
        msgParsed.value,
        reference,
        narrative,
        JSON.stringify(['disbursement']),
        null,
        null
      );
      if (cid != null) {
        const leRow = db.prepare(`SELECT id FROM ledger_entries WHERE tx_hash = ?`).get(tx.hash) as
          | { id: number }
          | undefined;
        if (leRow?.id != null) {
          computeAndStoreDisbursementAggregation({
            ledgerEntryId: leRow.id,
            txHash: tx.hash,
            causeId: cid,
            amountEth: valueEthStr,
          });
        }
      }
      void publishEvent('disbursement.created', {
        txHash: tx.hash,
        amountEth: valueEthStr,
        beneficiaryUserId: beneficiary.id,
        causeId: cid,
        causeName: cn,
      });
      res.json({ txHash: tx.hash, amountEth: valueEthStr });
    } catch (e: unknown) {
      console.error(e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Disbursement failed' });
    }
  });

  api.get('/ledger', (_req, res) => {
    const rows = db
      .prepare(`SELECT * FROM ledger_entries ORDER BY recorded_at ASC, id ASC LIMIT 500`)
      .all() as LedgerDbRow[];

    const vl = vaultLower();
    const mapped = rows.map((r) => mapLedgerRowToApi(r, vl));
    res.json(mapped);
  });

  // Ledger v2: searchable + filterable + enriched (narrative/reference/aggregation).
  api.get('/ledger/v2', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const kind = typeof req.query.kind === 'string' ? (req.query.kind as LedgerKind) : undefined;
    const reference = typeof req.query.reference === 'string' ? req.query.reference : undefined;
    const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
    const startIso = typeof req.query.start === 'string' ? req.query.start : undefined;
    const endIso = typeof req.query.end === 'string' ? req.query.end : undefined;
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;
    const offsetRaw = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : undefined;
    const causeIdRaw = typeof req.query.causeId === 'string' ? parseInt(req.query.causeId, 10) : undefined;

    const rows = searchLedgerV2({
      q,
      kind,
      reference,
      tag,
      startIso,
      endIso,
      limit: Number.isFinite(limitRaw as number) ? (limitRaw as number) : undefined,
      offset: Number.isFinite(offsetRaw as number) ? (offsetRaw as number) : undefined,
      causeId: Number.isFinite(causeIdRaw as number) ? (causeIdRaw as number) : undefined,
    });
    res.json(rows);
  });

  api.get('/ledger/v2/tags', (_req, res) => {
    const rows = db
      .prepare(`SELECT COALESCE(tags,'') AS tags FROM ledger_entries WHERE tags IS NOT NULL AND tags <> '' LIMIT 1000`)
      .all() as { tags: string }[];
    const set = new Set<string>();
    for (const r of rows) {
      try {
        const parsed = JSON.parse(r.tags) as unknown;
        if (Array.isArray(parsed)) {
          for (const t of parsed) {
            const s = String(t).trim();
            if (s) set.add(s);
          }
        } else {
          const s = String(parsed).trim();
          if (s) set.add(s);
        }
      } catch {
        const s = String(r.tags).trim();
        if (s) set.add(s);
      }
    }
    res.json({ tags: [...set].sort((a, b) => a.localeCompare(b)) });
  });

  api.get('/ledger/v2/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

    const row = db
      .prepare(
        `SELECT
          id, tx_hash, block_number, from_addr, to_addr, value_eth, kind, cause_id,
          from_display_name, to_display_name, cause_name, memo, recorded_at,
          tags, reference, narrative, linked_tx_ids, aggregated_from
         FROM ledger_entries
         WHERE id = ?`
      )
      .get(id) as
      | {
          id: number;
          tx_hash: string;
          block_number: number | null;
          from_addr: string;
          to_addr: string;
          value_eth: string;
          kind: string;
          cause_id: number | null;
          from_display_name: string | null;
          to_display_name: string | null;
          cause_name: string | null;
          memo: string | null;
          recorded_at: string;
          tags: string | null;
          reference: string | null;
          narrative: string | null;
          linked_tx_ids: string | null;
          aggregated_from: string | null;
        }
      | undefined;

    if (!row) return res.status(404).json({ error: 'Not found' });

    // Privacy logic is enforced here: only show full donor name for the logged-in user.
    const u = getUser(req);
    const currentUserName = u?.name ?? null;

    const linkedIds = (() => {
      try {
        const parsed = JSON.parse(row.linked_tx_ids ?? '[]') as unknown;
        return Array.isArray(parsed) ? parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
      } catch {
        return [];
      }
    })();

    const linkedDonations =
      linkedIds.length > 0
        ? (db
            .prepare(
              `SELECT id, value_eth, from_display_name, tx_hash, recorded_at
               FROM ledger_entries
               WHERE id IN (${linkedIds.map(() => '?').join(',')})`
            )
            .all(...linkedIds) as {
            id: number;
            value_eth: string;
            from_display_name: string | null;
            tx_hash: string;
            recorded_at: string;
          }[])
        : [];

    const donors = linkedDonations
      .map((d) => {
        const full = d.from_display_name?.trim() || '';
        const isSelf = currentUserName != null && full.toLowerCase() === currentUserName.toLowerCase();
        const displayName = isSelf ? full : (full ? full[0]!.toUpperCase() : 'Anonymous');
        return {
          donationEntryId: d.id,
          displayName,
          amountEth: d.value_eth,
          txHash: d.tx_hash,
          recordedAt: new Date(d.recorded_at + 'Z').toISOString(),
        };
      })
      .sort((a, b) => Number.parseFloat(b.amountEth) - Number.parseFloat(a.amountEth));

    const util =
      row.cause_id != null
        ? causeUtilizationByCauseId().get(row.cause_id) ?? null
        : null;

    res.json({
      entry: row,
      donors,
      aggregatedFrom: parseAggregatedFrom(row as never),
      utilization: util,
    });
  });

  api.get('/ledger/v2/:id/verify', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

    const row = db
      .prepare(`SELECT tx_hash, block_number FROM ledger_entries WHERE id = ?`)
      .get(id) as { tx_hash: string; block_number: number | null } | undefined;
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.block_number == null) return res.status(400).json({ error: 'Missing block number' });

    try {
      const provider = rpcProvider();
      const vault = anvilAddress(SUPER_RICH_INDEX);
      const beforeBlock = Math.max(0, row.block_number - 1);
      const [before, after] = await Promise.all([
        provider.getBalance(vault, beforeBlock),
        provider.getBalance(vault, row.block_number),
      ]);
      res.json({
        txHash: row.tx_hash,
        vaultMasked: maskAddr(vault),
        vaultBalanceBeforeEth: ethers.formatEther(before),
        vaultBalanceAfterEth: ethers.formatEther(after),
        blockNumber: row.block_number,
      });
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'verify failed' });
    }
  });

  // Donation lifecycle for a specific donor tx hash (auth + ownership required).
  api.get('/ledger/v2/lifecycle/:txHash', requireAuth, (req, res) => {
    const txHash = String(req.params.txHash || '').trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({ error: 'invalid tx hash' });
    }

    const u = getUser(req)!;
    if (u.anvil_index == null) return res.status(400).json({ error: 'No wallet assigned' });

    const userAddr = anvilAddress(u.anvil_index).toLowerCase();

    const donation = db
      .prepare(
        `SELECT
          id, tx_hash, block_number, from_addr, to_addr, value_eth, kind, cause_id,
          from_display_name, to_display_name, cause_name, memo, recorded_at,
          tags, reference, narrative, linked_tx_ids, aggregated_from
         FROM ledger_entries
         WHERE tx_hash = ? AND kind = 'donation_in'`
      )
      .get(txHash) as any;

    if (!donation) return res.status(404).json({ error: 'Donation not found' });
    if (String(donation.from_addr || '').toLowerCase() !== userAddr) {
      return res.status(403).json({ error: 'Not your donation' });
    }

    const donationId = Number(donation.id);
    const causeId = donation.cause_id != null ? Number(donation.cause_id) : null;

    // Find disbursements for the same cause and filter by linked_tx_ids containing this donation id.
    const candidate = causeId
      ? (db
          .prepare(
            `SELECT
              id, tx_hash, block_number, from_addr, to_addr, value_eth, kind, cause_id,
              from_display_name, to_display_name, cause_name, memo, recorded_at,
              tags, reference, narrative, linked_tx_ids, aggregated_from
             FROM ledger_entries
             WHERE kind = 'disbursement_out' AND cause_id = ?
             ORDER BY recorded_at ASC, id ASC`
          )
          .all(causeId) as any[])
      : [];

    const linkedDisbursements = candidate.filter((d) => {
      try {
        const arr = JSON.parse(d.linked_tx_ids ?? '[]') as unknown;
        return Array.isArray(arr) && arr.some((x) => Number(x) === donationId);
      } catch {
        return false;
      }
    });

    // Totals for the cause (for progress / remaining).
    const util = causeId != null ? causeUtilizationByCauseId().get(causeId) ?? null : null;

    res.json({
      donation,
      linkedDisbursements,
      utilization: util,
    });
  });

  // Donor impact summary (totals + per-cause breakdown).
  api.get('/me/impact', requireAuth, (req, res) => {
    const u = getUser(req)!;
    if (u.anvil_index == null || u.role !== 'donor') {
      return res.json({
        totalDonatedEth: 0,
        donationCount: 0,
        causesSupported: 0,
        byCause: [],
      });
    }
    const addr = anvilAddress(u.anvil_index).toLowerCase();
    const rows = db
      .prepare(
        `SELECT
          cause_id,
          COALESCE(cause_name, 'General allocation') AS cause_name,
          COUNT(*) AS donations,
          COALESCE(SUM(CAST(value_eth AS REAL)), 0) AS total_eth
         FROM ledger_entries
         WHERE kind = 'donation_in' AND lower(from_addr) = ?
         GROUP BY cause_id, cause_name
         ORDER BY total_eth DESC`
      )
      .all(addr) as { cause_id: number | null; cause_name: string; donations: number; total_eth: number }[];

    const byCause = rows.map((r) => ({
      causeId: r.cause_id,
      causeName: r.cause_name,
      donations: Number(r.donations) || 0,
      totalEth: Number(r.total_eth) || 0,
    }));
    const totalDonatedEth = byCause.reduce((s, c) => s + c.totalEth, 0);
    const donationCount = byCause.reduce((s, c) => s + c.donations, 0);

    res.json({
      totalDonatedEth,
      donationCount,
      causesSupported: byCause.length,
      byCause,
    });
  });

  // Contribution badges (per-cause totals for the signed-in donor).
  api.get('/me/badges', requireAuth, (req, res) => {
    const u = getUser(req)!;
    if (u.anvil_index == null) return res.json({ badges: [] });
    const addr = anvilAddress(u.anvil_index).toLowerCase();

    const rows = db
      .prepare(
        `SELECT
          cause_id,
          COALESCE(cause_name,'') AS cause_name,
          COUNT(*) AS donations,
          COALESCE(SUM(CAST(value_eth AS REAL)),0) AS total_eth
         FROM ledger_entries
         WHERE kind = 'donation_in' AND lower(from_addr) = ?
         GROUP BY cause_id, cause_name
         ORDER BY total_eth DESC`
      )
      .all(addr) as { cause_id: number | null; cause_name: string; donations: number; total_eth: number }[];

    function tier(totalEth: number): 'Bronze' | 'Silver' | 'Gold' {
      if (totalEth >= 5) return 'Gold';
      if (totalEth >= 1) return 'Silver';
      return 'Bronze';
    }

    res.json({
      badges: rows.map((r) => ({
        causeId: r.cause_id,
        causeName: r.cause_name || 'General allocation',
        donations: Number(r.donations) || 0,
        totalEth: Number(r.total_eth) || 0,
        tier: tier(Number(r.total_eth) || 0),
      })),
    });
  });

  api.get('/me/history', requireAuth, async (req, res) => {
    const u = getUser(req)!;
    const isVaultView = u.role === 'admin';
    if (!isVaultView && u.anvil_index == null) {
      return res.json({ entries: [], summary: null });
    }

    const walletIndex = isVaultView ? SUPER_RICH_INDEX : u.anvil_index!;
    const addr = anvilAddress(walletIndex);
    const addrLower = addr.toLowerCase();
    const vl = vaultLower();

    const rows = db
      .prepare(
        `SELECT * FROM ledger_entries
         WHERE lower(from_addr) = ? OR lower(to_addr) = ?
         ORDER BY recorded_at DESC, id DESC
         LIMIT 200`
      )
      .all(addrLower, addrLower) as LedgerDbRow[];

    const entries = rows.map((r) => ({
      ...mapLedgerRowToApi(r, vl),
      flow: (r.from_addr.toLowerCase() === addrLower ? 'sent' : 'received') as 'sent' | 'received',
    }));

    let totalSent: number;
    let totalReceived: number;
    let totalDisbursed: number;

    if (isVaultView) {
      const vaultAgg = db
        .prepare(
          `SELECT
            COALESCE(SUM(CASE WHEN lower(to_addr) = ? AND kind = 'donation_in' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS total_received,
            COALESCE(SUM(CASE WHEN lower(from_addr) = ? AND kind = 'disbursement_out' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS total_disbursed
           FROM ledger_entries`
        )
        .get(vl, vl) as { total_received: number; total_disbursed: number };
      totalReceived = Number(vaultAgg.total_received) || 0;
      totalDisbursed = Number(vaultAgg.total_disbursed) || 0;
      totalSent = totalDisbursed;
    } else {
      const agg = db
        .prepare(
          `SELECT
            COALESCE(SUM(CASE WHEN lower(from_addr) = ? AND kind = 'donation_in' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS total_sent,
            COALESCE(SUM(CASE WHEN lower(to_addr) = ? AND kind = 'disbursement_out' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS total_received
           FROM ledger_entries`
        )
        .get(addrLower, addrLower) as { total_sent: number; total_received: number };
      totalSent = Number(agg.total_sent) || 0;
      totalReceived = Number(agg.total_received) || 0;
      totalDisbursed = 0;
    }

    const onChainEth = await tryGetBalanceEth(addr);
    const chainLive = onChainEth != null;
    const currentEth = onChainEth ?? '0';
    const cur = parseFloat(currentEth);

    const isBeneficiary = u.role === 'beneficiary';
    let refMax: number;
    if (isVaultView) {
      refMax = Math.max(totalReceived, cur, 100, 1e-12);
    } else if (isBeneficiary) {
      refMax =
        totalReceived > 0 ? Math.max(totalReceived, cur, 1e-12) : Math.max(100, cur, 1e-12);
    } else {
      refMax = Math.max(100, cur + totalSent, 1e-12);
    }
    const fillRatio = Math.min(1, Math.max(0, cur / refMax));

    res.json({
      entries,
      summary: {
        currentEth,
        referenceMaxEth: refMax.toFixed(6),
        fillRatio,
        totalSentEth: totalSent.toFixed(6),
        totalReceivedEth: totalReceived.toFixed(6),
        totalDisbursedEth: totalDisbursed.toFixed(6),
        isVaultWallet: isVaultView,
        chainLive,
      },
    });
  });

  api.get('/balance/:anvilIndex', async (req, res) => {
    const idx = parseInt(req.params.anvilIndex, 10);
    if (idx < 0 || idx > 9) return res.status(400).json({ error: 'anvilIndex 0–9' });
    const eth = await tryGetBalanceEth(anvilAddress(idx));
    if (eth == null) {
      return res.json({ wei: '0', eth: '0', chainLive: false });
    }
    const wei = ethers.parseEther(eth);
    res.json({ wei: wei.toString(), eth, chainLive: true });
  });

  app.use('/api', api);
  return app;
}
