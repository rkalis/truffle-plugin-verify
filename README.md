# truffle-plugin-verify
[![NPM Version](https://img.shields.io/npm/v/truffle-plugin-verify.svg)](https://www.npmjs.com/package/truffle-plugin-verify)
[![NPM Monthly Downloads](https://img.shields.io/npm/dm/truffle-plugin-verify.svg)](https://www.npmjs.com/package/truffle-plugin-verify)
[![NPM License](https://img.shields.io/npm/l/truffle-assertions.svg)](https://www.npmjs.com/package/truffle-plugin-verify)


This truffle plugin allows you to automatically verify your smart contracts source code on Etherscan, straight from the Truffle CLI.

**Attention: This plugin is a very early work in progress, all information in this README is subject to change while in alpha.**

## Installation
1. Install the plugin with npm
```sh
npm install truffle-plugin-verify
```
2. Add the plugin to your `truffle.js` or `truffle-config.js` file
```js
module.exports = {
  /* ... rest of truffle-config */

  plugins: [
    'truffle-plugin-verify'
  ]
}
```
3. Generate an API Key on your Etherscan account (see the [Etherscan website](https://etherscan.io/apis))
4. Add your Etherscan API key to your truffle config (use something like `dotenv` to make sure you don't commit the api key)
```js
module.exports = {
  /* ... rest of truffle-config */

  api_keys: {
    etherscan: 'MY_API_KEY'
  }
}
```

## Usage
```
truffle run verify SmartContractName [--network networkName]
```

The network parameter should correspond to a network defined in the Truffle config file, with the correct network id set. The Ethereum main net and all public testnets are supported.

For example, if we defined `rinkeby` as network in Truffle, and we wish to verify the `SimpleStorage` contract:

```
truffle run verify SimpleStorage --network rinkeby
```

This can take some time, and will eventually either return `Pass - Verified` or `Fail - Unable to verify`.

## Notes
This plugin gets compiler optimisation settings from the truffle config file, so make sure that your truffle config settings are the same as when your contracts were compiled.

## Limitations & Roadmap
This plugin is in a very early version, so there is still functionality missing. Below is a non-exhaustive list of features that are currently missing from the plugin, that will be added in a later release.

* The plugin has no graceful error handling, so be sure to follow the usage exactly
* The plugin can only verify one smart contract at a time, instead of automatically verifying all deployed contracts
* There is no automatic testing / build process in place

## Support
If you found this plugin and can't wait for the above features to be completed, send me some Ξ or tokens at `0xe126b3E5d052f1F575828f61fEBA4f4f2603652a` and tweet me [@RoscoKalis](https://twitter.com/RoscoKalis) to let me know what you want your money to go towards.
