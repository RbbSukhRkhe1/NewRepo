# Anvil — repeatable demo state

Local **Anvil** data is ephemeral unless you save it. Use this for **consistent addresses** and **pre-funded** demo accounts across restarts.

## Check your Foundry / Anvil version

```bash
anvil --version
```

Flags differ slightly across versions; always `anvil --help` before scripting.

## Save state (typical pattern)

While Anvil is running, in a **second** terminal (example — verify against your `anvil --help`):

```bash
# Example intent: dump current chain state to a JSON file
anvil --dump-state ./anvil-state.json
```

Some workflows use **RPC `anvil_dumpState`** / **`anvil_loadState`** instead of CLI; see [Foundry Anvil reference](https://book.getfoundry.sh/reference/anvil/).

## Restore state on next run

```bash
# Example intent: start and hydrate from file
anvil --load-state ./anvil-state.json
```

**Team tip:** Commit **small** state files only if course policy allows; binary/large JSON may belong in **Git LFS** or a shared drive—not in git.

## Deterministic dev accounts

Anvil’s default mnemonic produces the same **first N accounts** across clean runs. Vaultex seed data maps demo users to **Anvil indices**—keep the same mnemonic when demoing so addresses line up with `seed.ts` expectations.

## Without state files

Minimum viable demo: start `anvil`, start `npm run dev`, let the API **seed SQLite** on first boot. Chain history may be empty until you perform donate/disburse actions in-session.
