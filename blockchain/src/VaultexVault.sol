// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VaultexVault
 * @notice Minimal ETH vault for capstone demos — holds native ETH; owner can withdraw.
 * @dev Backend “vault” today is still Anvil EOA index 0 (see backend/server/anvil.ts). This contract is optional on-chain anchoring for Foundry / future wiring.
 */
contract VaultexVault is Ownable, ReentrancyGuard {
    constructor(address initialOwner) Ownable(initialOwner) {}

    receive() external payable {}

    fallback() external payable {}

    function withdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "VaultexVault: zero to");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "VaultexVault: transfer failed");
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }
}
