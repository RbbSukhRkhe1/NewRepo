// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultexVault} from "../src/VaultexVault.sol";

contract VaultexVaultTest is Test {
    VaultexVault internal vault;
    address internal alice = address(0xA11CE);

    function setUp() public {
        vm.deal(alice, 10 ether);
        vm.prank(alice);
        vault = new VaultexVault(alice);
    }

    function test_OwnerSet() public view {
        assertEq(vault.owner(), alice);
    }

    function test_ReceiveETH() public {
        vm.prank(alice);
        (bool ok,) = payable(address(vault)).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(vault).balance, 1 ether);
        assertEq(vault.balance(), 1 ether);
    }

    function test_Withdraw() public {
        vm.deal(address(vault), 2 ether);
        vm.prank(alice);
        address payable bob = payable(address(0xB0B));
        vm.deal(bob, 0);
        vault.withdraw(bob, 1 ether);
        assertEq(bob.balance, 1 ether);
        assertEq(address(vault).balance, 1 ether);
    }
}
