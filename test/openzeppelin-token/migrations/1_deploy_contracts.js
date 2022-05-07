const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const SimpleTokenUpgradeable = artifacts.require("SimpleTokenUpgradeable");
const SimpleTokenUpgradeable2 = artifacts.require("SimpleTokenUpgradeable2");
const SimpleToken = artifacts.require("SimpleToken");
const SimpleProxy = artifacts.require("SimpleProxy");
const SimpleProxyAdmin = artifacts.require("SimpleProxyAdmin");

module.exports = async function (deployer) {
  await deployer.deploy(SimpleToken);
  await deployProxy(SimpleTokenUpgradeable, [], { deployer });
  await manuallyDeployProxy(deployer);
};

const manuallyDeployProxy = async function (deployer) {
  const SimpleTokenInstance = new web3.eth.Contract(SimpleTokenUpgradeable2.abi)
  const data = SimpleTokenInstance.methods.__SimpleToken_init().encodeABI();
  await deployer.deploy(SimpleProxyAdmin);
  await deployer.deploy(SimpleTokenUpgradeable2);
  await deployer.deploy(SimpleProxy, SimpleTokenUpgradeable2.address, SimpleProxyAdmin.address, data);
}
