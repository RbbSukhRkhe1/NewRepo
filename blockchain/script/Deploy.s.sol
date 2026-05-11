// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {VaultexVault} from "../src/VaultexVault.sol";

/// @notice Deploy VaultexVault with owner = deployer EOA.
/// @dev Use `PRIVATE_KEY` in env for non-default signer. Default is Anvil account #0 (local dev only).
contract Deploy is Script {
    /// @dev Well-known Anvil/Hardhat first account private key — **never** use on mainnet.
    uint256 internal constant ANVIL_DEFAULT_PK =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external {
        uint256 pk = vm.envOr("PRIVATE_KEY", ANVIL_DEFAULT_PK);
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);
        VaultexVault vault = new VaultexVault(deployer);
        console2.log("VaultexVault:", address(vault));
        console2.log("Owner:", vault.owner());
        vm.stopBroadcast();
    }
}
