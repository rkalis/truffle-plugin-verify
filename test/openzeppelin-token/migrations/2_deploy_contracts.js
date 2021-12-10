const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const SimpleTokenUpgradeable = artifacts.require("SimpleTokenUpgradeable");
const SimpleToken = artifacts.require("SimpleToken");

module.exports = async function (deployer) {
  await deployer.deploy(SimpleToken);
  await deployProxy(SimpleTokenUpgradeable, [], { deployer });
};
