import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
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

const vaultLower = () => anvilAddress(SUPER_RICH_INDEX).toLowerCase();

function rpcProvider() {
  return new ethers.JsonRpcProvider(getRpcHttpUrl());
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
    if (!/^\/[\w./-]+\.[A-Za-z0-9]+$/.test(s)) {
      return { ok: false, error: 'image path must look like /folder/file.svg' };
    }
    return { ok: true, value: s };
  }
  let u: URL;
  try {
    u = new URL(s);
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
  from_display_name: string | null;
  to_display_name: string | null;
  recorded_at: string;
};

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
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '512kb' }));
  app.use(
    cookieSession({
      name: 'session',
      keys: [process.env.SESSION_SECRET || 'vaultex-dev-secret-key'],
      maxAge: 7 * 24 * 3600 * 1000,
      sameSite: 'lax',
      httpOnly: true,
    }) as express.RequestHandler
  );

  const api = express.Router();

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
    res.json(row);
  });

  api.get('/causes', (_req, res) => {
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
    res.json(rows);
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
        `INSERT INTO causes (title, description, goal_eth, raised_eth, image_url, active) VALUES (?,?,?,?,?,1)`
      )
      .run(title.trim(), description.trim(), goalEth, 0, img.value);
    res.status(201).json({ id: Number(r.lastInsertRowid) });
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
      db.prepare(
        `INSERT INTO ledger_entries (
          tx_hash, block_number, from_addr, to_addr, value_eth, kind,
          cause_id, from_display_name, to_display_name, cause_name
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(tx_hash) DO UPDATE SET
          block_number = excluded.block_number,
          from_addr = excluded.from_addr,
          to_addr = excluded.to_addr,
          value_eth = excluded.value_eth,
          kind = excluded.kind,
          cause_id = excluded.cause_id,
          from_display_name = excluded.from_display_name,
          to_display_name = excluded.to_display_name,
          cause_name = excluded.cause_name`
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
        cause.title
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

  api.post('/disburse', requireAuth, requireAdmin, async (req, res) => {
    const { beneficiaryUserId, amountEth, causeName } = req.body as {
      beneficiaryUserId?: number;
      amountEth?: string;
      causeName?: string;
    };
    if (beneficiaryUserId == null || !amountEth) {
      return res.status(400).json({ error: 'beneficiaryUserId and amountEth required' });
    }
    const beneficiary = db
      .prepare(`SELECT * FROM users WHERE id = ? AND role = 'beneficiary'`)
      .get(beneficiaryUserId) as UserRow | undefined;
    if (!beneficiary?.anvil_index) return res.status(404).json({ error: 'Beneficiary user not found' });
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
      const cn = causeName?.trim() || 'General allocation';
      db.prepare(
        `INSERT INTO ledger_entries (
          tx_hash, block_number, from_addr, to_addr, value_eth, kind,
          cause_id, from_display_name, to_display_name, cause_name
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(tx_hash) DO UPDATE SET
          block_number = excluded.block_number,
          from_addr = excluded.from_addr,
          to_addr = excluded.to_addr,
          value_eth = excluded.value_eth,
          kind = excluded.kind,
          cause_id = excluded.cause_id,
          from_display_name = excluded.from_display_name,
          to_display_name = excluded.to_display_name,
          cause_name = excluded.cause_name`
      ).run(
        tx.hash,
        receipt?.blockNumber ?? null,
        signer.address,
        to,
        valueEthStr,
        'disbursement_out',
        null,
        'Vaultex',
        beneficiary.name,
        cn
      );
      void publishEvent('disbursement.created', {
        txHash: tx.hash,
        amountEth: valueEthStr,
        beneficiaryUserId: beneficiary.id,
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

  api.get('/me/history', requireAuth, async (req, res) => {
    const u = getUser(req)!;
    if (u.anvil_index == null) {
      return res.json({ entries: [], summary: null });
    }

    const addr = anvilAddress(u.anvil_index);
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

    const agg = db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN lower(from_addr) = ? AND kind = 'donation_in' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS total_sent,
          COALESCE(SUM(CASE WHEN lower(to_addr) = ? AND kind = 'disbursement_out' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS total_received
         FROM ledger_entries`
      )
      .get(addrLower, addrLower) as { total_sent: number; total_received: number };

    const totalSent = Number(agg.total_sent) || 0;
    const totalReceived = Number(agg.total_received) || 0;

    try {
      const provider = rpcProvider();
      const bal = await provider.getBalance(addr);
      const currentEth = ethers.formatEther(bal);
      const cur = parseFloat(currentEth);

      const isBeneficiary = u.role === 'beneficiary';
      let refMax: number;
      if (isBeneficiary) {
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
        },
      });
    } catch (e: unknown) {
      console.error(e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'history error' });
    }
  });

  api.get('/balance/:anvilIndex', async (req, res) => {
    const idx = parseInt(req.params.anvilIndex, 10);
    if (idx < 0 || idx > 9) return res.status(400).json({ error: 'anvilIndex 0–9' });
    try {
      const provider = rpcProvider();
      const bal = await provider.getBalance(anvilAddress(idx));
      res.json({ wei: bal.toString(), eth: ethers.formatEther(bal) });
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'balance error' });
    }
  });

  app.use('/api', api);
  return app;
}
