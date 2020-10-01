// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;

import "./MetaCoin.sol";

contract WrappedMetaCoin {
	MetaCoin public underlying;

	constructor(MetaCoin _underlying) public {
		underlying = _underlying;
	}

	function sendCoin(address receiver, uint amount) public returns(bool sufficient) {
		return underlying.sendCoin(receiver, amount);
	}

	function getBalanceInEth(address addr) public view returns(uint){
		return underlying.getBalanceInEth(addr);
	}

	function getBalance(address addr) public view returns(uint) {
		return underlying.getBalance(addr);
	}
}
