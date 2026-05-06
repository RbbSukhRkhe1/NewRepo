// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ValutexVault} from "../src/ValutexVault.sol";

contract DeployValutexVault is Script {
    function run() external {
        vm.startBroadcast();

        // Base Sepolia WETH
        address weth = 0x4200000000000000000000000000000000000006;

        ValutexVault vault = new ValutexVault(IERC20(weth));
        console.log("ValutexVault deployed at:", address(vault));
        vm.stopBroadcast();
    }
}
