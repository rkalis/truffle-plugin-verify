// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract SimpleTokenUpgradeable is ERC20Upgradeable {
    function __SimpleToken_init() external initializer {
        __ERC20_init("Simple Token", "SIM");
        _mint(msg.sender, 1000000 * (10 ** uint256(decimals())));
    }
}
