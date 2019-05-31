var Casino = artifacts.require("./Casino.sol");

module.exports = function(deployer) {
    deployer.deploy(Casino);
};
