# Vaultex — Solidity (Foundry)

Contracts live in **`src/`**. Deploy scripts in **`script/`**. Tests in **`test/`**.

The **root** of the monorepo contains **`foundry.toml`** — run all Forge commands from the **repository root** (`NewRepo/`), not from this folder.

```bash
forge build
forge test
forge script blockchain/script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast
```

See the main **[README.md](../README.md)** (Blockchain section) and **[docs/ANVIL_STATE.md](../docs/ANVIL_STATE.md)** for Anvil, env vars, and artifact paths.

**Note:** The backend “vault” for donations today is still **Anvil EOA index 0** (`backend/server/anvil.ts`). `VaultexVault.sol` is a separate on-chain vault for demos and future wiring.
