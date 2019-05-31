pragma solidity ^0.5.0;

contract Killable {
    address public owner;

    constructor() public {
        owner = msg.sender;
    }

    function kill() external {
        require(msg.sender == owner, "Only the owner can kill this contract");
        selfdestruct(address(uint160(owner)));
    }
}
