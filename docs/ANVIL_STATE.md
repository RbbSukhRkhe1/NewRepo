# Anvil — repeatable demo state

Local **Anvil** data is ephemeral unless you save it. Use this for **consistent addresses** and **pre-funded** demo accounts across restarts.

## Check your Foundry / Anvil version

```bash
anvil --version
forge --version
```

Flags differ slightly across versions; always `anvil --help` before scripting.

---

## Build & deploy the Solidity vault (Foundry)

From the **repository root** (where `foundry.toml` lives):

```bash
forge build
forge test
```

Start Anvil (default `http://127.0.0.1:8545`), then in another shell:

```bash
forge script blockchain/script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

- The deploy script signs with **`PRIVATE_KEY`** from the environment if set; otherwise it uses **Anvil account #0**’s well-known dev key (local only).
- Console output includes **`VaultexVault:`** `<address>` and **`Owner:`** `<address>`.

**Get the address into `backend/.env` (optional, for future API wiring):**

1. Copy the **`VaultexVault:`** line from the terminal, **or** open  
   `broadcast/Deploy.s.sol/<chainId>/run-latest.json`  
   at the **repository root** (Forge writes `broadcast/` next to `foundry.toml`).
2. Set:

   ```env
   VAULTEX_VAULT_ADDRESS=0x...
   ```

   (Placeholder in `backend/.env.example`.)

The running Vaultex **Node app** still uses the **EOA at Anvil index 0** as the donation vault (`backend/server/anvil.ts`). The Solidity **`VaultexVault`** is a separate artifact for demos and future integration.

---

## Save chain state (optional)

While Anvil is running, in a **second** terminal (example — verify against your `anvil --help`):

```bash
# Example intent: dump current chain state to a JSON file
anvil --dump-state ./anvil-state.json
```

Some workflows use **RPC `anvil_dumpState`** / **`anvil_loadState`** instead of CLI; see [Foundry Anvil reference](https://book.getfoundry.sh/reference/anvil/).

### Restore state on next run

```bash
# Example intent: start and hydrate from file
anvil --load-state ./anvil-state.json
```

**Team tip:** Commit **small** state files only if course policy allows; binary/large JSON may belong in **Git LFS** or a shared drive—not in git.

---

## Deterministic dev accounts

Anvil’s default mnemonic produces the same **first N accounts** across clean runs. Vaultex seed data maps demo users to **Anvil indices**—keep the same mnemonic when demoing so addresses line up with `seed.ts` expectations.

---

## Without state files

Minimum viable demo: start `anvil`, start `npm run dev`, let the API **seed SQLite** on first boot. Chain history may be empty until you perform donate/disburse actions in-session.
