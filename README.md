# truffle-plugin-verify

This truffle plugin allwos you to automatically verify your smart contracts source code on Etherscan, straight from the Truffle CLI.

## Installation
1. Install the package
```sh
npm install truffle-plugin-verify
```
2. Add the plugin to your `truffle.js` or `truffle-config.js`
```js
module.exports = {
  /* ... rest of truffle-config */

  plugins: [
    "truffle-plugin-verify"
  ]
}
```
3. Generate an API Key on your Etherscan account (see the Etherscan website)
4. Add your Etherscan API key to your truffle config (use something like `dotenv` to make sure you don't commit the api key)
```js
module.exports = {
  /* ... rest of truffle-config */

  verify: {
    etherscanApiKey: 'MY_API_KEY'
  }
}
```

## Usage
```
truffle run verify SmartContractName [--network networkName]
```

For example, if we defined `rinkeby` as network in Truffle, and we wish to verify the `SimpleStorage` contract:

```
truffle run verify SimpleStorage --network rinkeby
```

This will return a `guid` which can be checked to see if the verification succeeded. This will be automated in a future release.

```
https://api.etherscan.io/api?module=contract&action=checkverifystatus&apikey=MY_API_KEY&guid=MY_GUID
```

## Limitations & Roadmap
This plugin is in a very early version, so there is still a lot missing. Below is a non-exhaustive list of features that are currently missing from the plugin, that will be added in a later release.

* The plugin only works with single file contracts (i.e. no import flattening)
* The plugin has no external library support
* The plugin has no constructor arguments support
* The plugin assumes compiler optimisation has been used
* The plugin has no graceful error handling, so be sure to follow the usage exactly
* The plugin currently only supports mainnet and rinkeby
* The plugin assumes it can find build artifacts under the `build/contracts/` directory (i.e. no support for custom paths)
* The plugin has no support to automatically check the verification status back from Etherscan

## Support
I need funding to develop this plugin to its full potential. If you found this plugin and can't wait for the above features to be completed as well, send me some Ξ or tokens at `0x6775f0Ee4E63983501DBE7b0385bF84DBd36D69B` and tweet me [@RoscoKalis](https://twitter.com/RoscoKalis) to let me know what you want your money to go towards.
