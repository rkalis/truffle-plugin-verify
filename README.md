# truffle-plugin-verify
[![NPM Version](https://img.shields.io/npm/v/truffle-plugin-verify.svg)](https://www.npmjs.com/package/truffle-plugin-verify)
[![NPM Monthly Downloads](https://img.shields.io/npm/dm/truffle-plugin-verify.svg)](https://www.npmjs.com/package/truffle-plugin-verify)
[![NPM License](https://img.shields.io/npm/l/truffle-assertions.svg)](https://www.npmjs.com/package/truffle-plugin-verify)

This truffle plugin allows you to automatically verify your smart contracts' source code on Etherscan, straight from the Truffle CLI.

I wrote a tutorial on my website that goes through the entire process of installing and using this plugin: [Automatically verify Truffle smart contracts on Etherscan](https://kalis.me/verify-truffle-smart-contracts-etherscan/).

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
4. Add your Etherscan API key to your truffle config (make sure to use something like `dotenv` so you don't commit the api key)
    ```js
    module.exports = {
      /* ... rest of truffle-config */

      api_keys: {
        etherscan: 'MY_API_KEY'
      }
    }
    ```

## Usage
Before running verification, make sure that you have actually deployed your contracts to a public network with Truffle. After deployment, run the following command with one or more contracts that you wish to verify:

```
truffle run verify SomeContractName AnotherContractName --network networkName
```

The network parameter should correspond to a network defined in the Truffle config file, with the correct network id set. The Ethereum mainnet and all main public testnets are supported.

For example, if we defined `rinkeby` as network in Truffle, and we wish to verify the `SimpleStorage` contract:

```
truffle run verify SimpleStorage --network rinkeby
```

This can take some time, and will eventually either return `Pass - Verified` or `Fail - Unable to verify` for each contract. Since the information we get from the Etherscan API is quite limited, it is currently impossible to retrieve any more information on verification failure. There should be no reason though why the verification should fail if the usage is followed correctly. If you do receive a `Fail - Unable to verify` and you are sure that you followed the instructions correctly, please [open an issue](/issues/new) and I will look into it.

### Address override (Optional)
You can optionally provide an explicit address of the contract(s) that you wish to verify. This may be useful when you have deployed multiple instances of the same contract. The address is appended with `@<address>` as follows:
```
truffle run verify SimpleStorage@0x61C9157A9EfCaf6022243fA65Ef4666ECc9FD3D7 --network rinkeby
```

### Adding Preamble (Optional)
You can optionally provide a preamble to the beginning of your verified source code. This may be useful for adding authorship information, links to source code, copyright information, or versioning information.

To do so, add the following to your `truffle.js` or `truffle-config.js` file
```js
module.exports = {
  /* ... rest of truffle-config */

  verify: {
    preamble: "Author: John Citizen.\nVersion: 1.0.1"
  }
}
```

## Notes
This plugin gets compiler optimisation settings from the truffle config file, so make sure that your truffle config settings are the same as they were when your contracts were compiled.

## Donations
If you've used this plugin and found it helpful in your workflow, please consider sending some Ξ or tokens to `0xe126b3E5d052f1F575828f61fEBA4f4f2603652a`.
