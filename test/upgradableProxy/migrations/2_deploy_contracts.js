const SimpleTokenUpgradeable = artifacts.require("SimpleTokenUpgradeable");
const SimpleProxy = artifacts.require("SimpleProxy");
const SimpleProxyAdmin = artifacts.require("SimpleProxyAdmin");

module.exports = async function (deployer) {
    const SimpleTokenInstance = new web3.eth.Contract(SimpleTokenUpgradeable.abi)
    const data = SimpleTokenInstance.methods.__SimpleToken_init().encodeABI();
    await deployer.deploy(SimpleProxyAdmin);
    await deployer.deploy(SimpleTokenUpgradeable);
    await deployer.deploy(SimpleProxy,SimpleTokenUpgradeable.address,SimpleProxyAdmin.address,data);
};
