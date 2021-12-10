# truffle-plugin-verify
[![NPM Version](https://img.shields.io/npm/v/truffle-plugin-verify.svg)](https://www.npmjs.com/package/truffle-plugin-verify)
[![NPM Monthly Downloads](https://img.shields.io/npm/dm/truffle-plugin-verify.svg)](https://www.npmjs.com/package/truffle-plugin-verify)
[![NPM License](https://img.shields.io/npm/l/truffle-assertions.svg)](https://www.npmjs.com/package/truffle-plugin-verify)

This truffle plugin allows you to automatically verify your smart contracts' source code on Etherscan, straight from the Truffle CLI.

I wrote a tutorial on my website that goes through the entire process of installing and using this plugin: [Automatically verify Truffle smart contracts on Etherscan](https://kalis.me/verify-truffle-smart-contracts-etherscan/).

**Note:** This version of the plugin uses **multi-file verification**. If you want to use source code flattening instead for any reason, please use the [legacy version (v0.4.x)](https://github.com/rkalis/truffle-plugin-verify/tree/legacy) of the plugin.

## Installation / preparation
1. Install the plugin with npm or yarn
   ```sh
   npm install -D truffle-plugin-verify
   yarn add -D truffle-plugin-verify
   ```
2. Add the plugin to your `truffle-config.js` file
   ```js
   module.exports = {
     /* ... rest of truffle-config */

     plugins: ['truffle-plugin-verify']
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
Before running verification, make sure that you have successfully deployed your contracts to a public network with Truffle. The contract deployment must have completely finished without errors, including the final step of "saving migration to chain," so that the artifact files are updated with the required information. If this final step fails, try lowering your global gas limit in your `truffle-config.js` file, as saving migrations to chain uses your global gas limit and gas price, which could be problematic if you do not have sufficient ETH in your wallet to cover this maximum hypothetical cost.

After deployment, run the following command with one or more contracts that you wish to verify:

```
truffle run verify SomeContractName AnotherContractName --network networkName [--debug]
```

The network parameter should correspond to a network defined in the Truffle config file, with the correct network id set. The Ethereum mainnet and all main public testnets are supported.

For example, if we defined `rinkeby` as network in Truffle, and we wish to verify the `SimpleStorage` contract:

```
truffle run verify SimpleStorage --network rinkeby
```

This can take some time, and will eventually either return `Pass - Verified` or `Fail - Unable to verify` for each contract. Since the information we get from the Etherscan API is quite limited, it is currently impossible to retrieve any more information on verification failure. There should be no reason though why the verification should fail if the usage is followed correctly.

If you do receive a `Fail - Unable to verify` and you are sure that you followed the instructions correctly, please [open an issue](/issues/new) and I will look into it. Optionally, a `--debug` flag can also be passed into the CLI to output additional debug messages. It is helpful if you run this once before opening an issue and provide the output in your bug report.

### Proxy Contracts
This plugin supports [EIP1967](https://eips.ethereum.org/EIPS/eip-1967) proxies out of the box. If you try to verify a proxy contract (e.g. contracts deployed with OpenZeppelin's `deployProxy`), it will correctly verify the implementation contract and call Etherscan's "proxy verification" so that the proxy contract gets marked as a proxy on Etherscan (enabling Read/Write as Proxy). Note that EIP1967 *Beacon* contracts are not yet supported, and other types of non-standard proxies are also not supported.

### Address override (Optional)
You can optionally provide an explicit address of the contract(s) that you wish to verify. This may be useful when you have deployed multiple instances of the same contract. The address is appended with `@<address>` as follows:

```
truffle run verify SimpleStorage@0x61C9157A9EfCaf6022243fA65Ef4666ECc9FD3D7 --network rinkeby
```

### Constructor arguments override (Optional)
You can additionally provide an explicit constructor arguments for the contract using the `--forceConstructorArgs` option. This is useful if the contract was created by another contract rather an EOA, because truffle-plugin-verify cannot automatically retrieve constructor arguments in these cases. Note that the value needs to be prefixed with `string:` (e.g. `--forceConstructorArgs string:0000`).

```
truffle run verify MetaCoin --forceConstructorArgs string:0000000000000000000000000cb966d6a7702a4eff64009502653e302b3ec365 --network goerli
```

### Debugging
You can pass an optional `--debug` flag into the plugin to display debug messages during the verification process. This is generally not necessary, but can be used to provide additional information when the plugin appears to malfunction.

```
truffle run verify SimpleStorage --network rinkeby
```

### Usage with other chains
These instructions were written for verification on Etherscan for Ethereum mainnet and testnets, but it also works for verification on other platforms for other chains. To verify your contracts on these chains make sure that your `truffle-config.js` file contains a network config for your preferred network.

Also make sure that you request an API key from the platform that you're using and add it to your `truffle-config.js` file. If you want to verify your contracts on multiple chains, please provide separate API keys. Note that Optimistic Etherscan and Arbiscan do not require additional API keys.

```js
module.exports = {
  /* ... rest of truffle-config */

  api_keys: {
    etherscan: 'MY_API_KEY',
    bscscan: 'MY_API_KEY',
    snowtrace: 'MY_API_KEY',
    polygonscan: 'MY_API_KEY',
    ftmscan: 'MY_API_KEY',
    hecoinfo: 'MY_API_KEY',
    moonscan: 'MY_API_KEY'
  }
}
```

#### All supported platforms & networks
- [Etherscan](https://etherscan.io/) (Ethereum Mainnet & Ropsten, Kovan, Rinkeby, Goerli Testnets)
- [Optimistic Etherscan](https://optimistic.etherscan.io/) (Optimistic Ethereum Mainnet & Kovan Testnet)
- [Arbiscan](https://arbiscan.io) (Arbitrum Mainnet & Rinkeby Testnet)
- [BscScan](https://bscscan.com) (BSC Mainnet & Testnet)
- [Snowtrace](https://snowtrace.io/) (Avalanche Mainnet & Fuji Testnet)
- [PolygonScan](https://polygonscan.com) (Polygon Mainnet & Mumbai Testnet)
- [FtmScan](https://ftmscan.com) (Fantom Mainnet & Testnet)
- [HecoInfo](https://hecoinfo.com) (HECO Mainnet & Testnet)
- [Moonscan](https://moonscan.io/) (Moonriver Mainnet)

## Notes
This plugin has a naming conflict with the truffle-security plugin, so when using both truffle-security and truffle-plugin-verify in the same project, `truffle run etherscan` can be used instead of `truffle run verify` for truffle-plugin-verify.

## Donations
If you've used this plugin and found it helpful in your workflow, please consider sending some Ξ or tokens to `0xe126b3E5d052f1F575828f61fEBA4f4f2603652a` or `kalis.eth`.
