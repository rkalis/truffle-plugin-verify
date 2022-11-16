# truffle-plugin-verify

[![NPM Version](https://img.shields.io/npm/v/truffle-plugin-verify.svg)](https://www.npmjs.com/package/truffle-plugin-verify)
[![NPM Monthly Downloads](https://img.shields.io/npm/dm/truffle-plugin-verify.svg)](https://www.npmjs.com/package/truffle-plugin-verify)
[![NPM License](https://img.shields.io/npm/l/truffle-assertions.svg)](https://www.npmjs.com/package/truffle-plugin-verify)

This truffle plugin allows you to automatically verify your smart contracts' source code on Etherscan and Sourcify, straight from the Truffle CLI.

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

     plugins: ['truffle-plugin-verify'],
   };
   ```

When only verifying on Sourcify, no more steps are required. When verifying on Etherscan (and derived explorers like PolygonScan), the appropriate API keys need to be specified:

3. Generate an API Key on your Etherscan account (see the [Etherscan website](https://etherscan.io/apis))
4. Add your Etherscan API key to your truffle config (make sure to use something like `dotenv` so you don't commit the api key)

   ```js
   module.exports = {
     /* ... rest of truffle-config */

     api_keys: {
       etherscan: 'MY_API_KEY',
     },
   };
   ```

## Usage

Before running verification, make sure that you have successfully deployed your contracts to a supported network with Truffle. The contract deployment must have completely finished without errors. After deploying, run the following command with one or more contracts that you wish to verify:

```
truffle run verify SomeContractName AnotherContractName --network networkName [--debug] [--verifiers=etherscan,sourcify]
```

The network parameter should correspond to a network defined in the Truffle config file, with the correct network id set. For example, if we defined `goerli` as a network in Truffle, and we wish to verify the `SimpleStorage` contract:

```
truffle run verify SimpleStorage --network goerli
```

This can take some time, and will eventually either return `Pass - Verified` or `Fail - Unable to verify` for each contract. Since the information we get from the Etherscan API is quite limited, it is currently impossible to retrieve any more information on verification failure. There should be no reason though why the verification should fail if the usage is followed correctly. If you do receive a `Fail - Unable to verify` and you are sure that you followed the instructions correctly, please [open an issue](/issues/new).

By default the plugin attempts to verify contracts both on Etherscan and Sourcify. If you only want to verify with one of them instead of both, you can specify so using the `--verifiers` argument.

```
truffle run verify SimpleStorage --network goerli --verifiers=etherscan
truffle run verify SimpleStorage --network goerli --verifiers=sourcify
```

### Usage with the Truffle Dashboard

In 2022, Truffle launched an awesome new feature called the Truffle Dashboard that allows you to deploy your contracts using your MetaMask wallet. truffle-plugin-verify works with the Truffle Dashboard out of the box, but for it to work correctly you need to make sure that you are running the truffle dashboard, **connected to the same network** as you used for deployment _while_ you're running `truffle run verify ...`

### Usage with proxy contracts

This plugin supports [EIP1967](https://eips.ethereum.org/EIPS/eip-1967) proxies out of the box. If you try to verify a proxy contract (e.g. contracts deployed with OpenZeppelin's `deployProxy`), it will correctly verify the implementation contract and call Etherscan's "proxy verification" so that the proxy contract gets marked as a proxy on Etherscan (enabling Read/Write as Proxy). Note that EIP1967 _Beacon_ contracts are not yet supported, and other types of non-standard proxies are also not supported.

When using OpenZeppelin's `deployProxy` functionality, proxy verification should work automatically. For custom proxy contracts you need to use the `--custom-proxy` flag. The name of the proxy contract should be passed after this flag.

```
truffle run verify SimpleTokenUpgradeable --network goerli
truffle run verify SimpleTokenUpgradeable --custom-proxy SimpleProxy --network goerli
```

### Address override (Optional)

You can optionally provide an explicit address of the contract(s) that you wish to verify. This may be useful when you have deployed multiple instances of the same contract. The address is appended with `@<address>` as follows:

```
truffle run verify SimpleStorage@0x61C9157A9EfCaf6022243fA65Ef4666ECc9FD3D7 --network goerli
```

### Run verification through an HTTP proxy (Optional)

In some cases the Etherscan or Sourcify websites may not be directly accessible. In this case it is possible to configure proxy settings so that the API requests will be made through this proxy. To use this feature, please add the relevant proxy settings to your truffle-config under `verify.proxy`.

```js
module.exports = {
  /* ... rest of truffle-config */

  verify: {
    proxy: {
      host: '127.0.0.1',
      port: '1080',
    },
  },
};
```

### Constructor arguments override (Optional)

You can additionally provide an explicit constructor arguments for the contract using the `--forceConstructorArgs` option. This is useful if the contract was created by another contract rather than an EOA, because truffle-plugin-verify cannot automatically retrieve constructor arguments in these cases. Note that the value needs to be prefixed with `string:` (e.g. `--forceConstructorArgs string:0000`).

```
truffle run verify MetaCoin --forceConstructorArgs string:0000000000000000000000000cb966d6a7702a4eff64009502653e302b3ec365 --network goerli
```

### Debugging

You can pass an optional `--debug` flag into the plugin to display debug messages during the verification process. This is generally not necessary, but can be used to provide additional information when the plugin appears to malfunction.

```
truffle run verify SimpleStorage --network goerli --debug
```

### Supported chains

These instructions were written for Ethereum mainnet and testnets, but it also works for verification on other platforms for other chains. Sourcify verification has support for many EVM based chains and no API keys are required. For verification on Etherscan-derived explorers you can refer to the list below for supported chains. Also make sure to request an API key from the platform that you're using and add it to your `truffle-config.js` file. If you want to verify your contracts on multiple chains, please provide separate API keys.

```js
module.exports = {
  /* ... rest of truffle-config */

  api_keys: {
    etherscan: 'MY_API_KEY',
    optimistic_etherscan: 'MY_API_KEY',
    arbiscan: 'MY_API_KEY',
    nova_arbiscan: 'MY_API_KEY',
    bscscan: 'MY_API_KEY',
    snowtrace: 'MY_API_KEY',
    polygonscan: 'MY_API_KEY',
    ftmscan: 'MY_API_KEY',
    hecoinfo: 'MY_API_KEY',
    moonscan: 'MY_API_KEY',
    moonriver_moonscan: 'MY_API_KEY',
    bttcscan: 'MY_API_KEY',
    aurorascan: 'MY_API_KEY',
    cronoscan: 'MY_API_KEY',
    gnosisscan: 'MY_API_KEY',
    celoscan: 'MY_API_KEY',
    clvscan: 'MY_API_KEY',
  },
};
```

#### All supported Etherscan-derived platforms & networks

- [Etherscan](https://etherscan.io/) (Ethereum Mainnet & Goerli, Sepolia Testnets)
- [Optimistic Etherscan](https://optimistic.etherscan.io/) (Optimistic Ethereum Mainnet & Goerli Testnet)
- [Arbiscan](https://arbiscan.io) (Arbitrum Mainnet & Goerli Testnet)
- [Arbiscan Nova](https://nova.arbiscan.io) (Arbitrum Nova)
- [BscScan](https://bscscan.com) (BSC Mainnet & Testnet)
- [Snowtrace](https://snowtrace.io/) (Avalanche Mainnet & Fuji Testnet)
- [PolygonScan](https://polygonscan.com) (Polygon Mainnet & Mumbai Testnet)
- [FtmScan](https://ftmscan.com) (Fantom Mainnet & Testnet)
- [HecoInfo](https://hecoinfo.com) (HECO Mainnet & Testnet)
- [Moonscan](https://moonscan.io/) (Moonbeam Mainnet & Moonbase Alpha Testnet)
- [Moonriver Moonscan](https://moonriver.moonscan.io/) (Moonriver Mainnet)
- [BTTCScan](https://bttcscan.com/) (BitTorrent Mainnet & Donau Testnet)
- [Aurorascan](https://aurorascan.dev/) (Aurora Mainnet & Testnet)
- [Cronoscan](https://cronoscan.com) (Cronos Mainnet & Testnet)
- [Gnosisscan](https://gnosisscan.io) (Gnosis Mainnet)
- [CLVScan](https://clvscan.com/) (CLV Mainnet)
- [Celoscan](https://celoscan.io/) (Celo Mainnet & Alfajores Testnet)

### Usage with unsupported chains

In cases where the platform you want to use supports an Etherscan-compatible API but is not listed above, you may manually specify the `apiUrl` and `explorerUrl` (optional) for the platform. To use this feature, please add the relevant settings to your truffle-config under `networks.<name of your network>.verify`.

```js
module.exports = {
  /* ... rest of truffle-config */

  networks: {
    /* ... other networks */

    network_with_custom_platform: {
      verify: {
        apiUrl: 'http://localhost:4000/api',
        apiKey: 'MY_API_KEY',
        explorerUrl: 'http://localhost:4000/address',
      },
    },
  },
};
```

## Notes

This plugin has a naming conflict with the truffle-security plugin, so when using both truffle-security and truffle-plugin-verify in the same project, `truffle run etherscan` can be used instead of `truffle run verify` for truffle-plugin-verify.
