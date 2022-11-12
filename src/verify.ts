import axios from 'axios';
import tunnel from 'tunnel';
import { API_URLS, EXPLORER_URLS, VerificationStatus, VERSION } from './constants';
import { Options, TruffleConfig } from './types';
import { enforce, enforceOrThrow, getApiKey, getArtifact, getImplementationAddress, getNetwork } from './util';
import { SourcifyVerifier } from './verifier/SourcifyVerifier';

const cliLogger = require('cli-logger');
const logger = cliLogger({ level: 'info' });

module.exports = async (config: TruffleConfig) => {
  // Set debug logging
  if (config.debug) logger.level('debug');
  logger.debug('DEBUG logging is turned ON');
  logger.debug(`Running truffle-plugin-verify v${VERSION}`);

  if (config.verify?.proxy) {
    const { proxy } = config.verify;
    logger.debug('Enable verify proxy ', proxy);
    axios.interceptors.request.use((conf) => {
      conf.httpsAgent = tunnel.httpsOverHttp({ proxy });
      conf.proxy = false;
      return conf;
    });
  }

  const options = await parseConfig(config);

  const verifier = new SourcifyVerifier(logger, options);

  // Verify each contract
  const contractNameAddressPairs = config._.slice(1);

  // Track which contracts failed verification
  const failedContracts = [];
  for (const contractNameAddressPair of contractNameAddressPairs) {
    logger.info(`Verifying ${contractNameAddressPair}`);
    try {
      const [contractName, contractAddress] = contractNameAddressPair.split('@');

      // If we pass a custom proxy contract, we use its artifact to trigger proxy verification
      const artifact = getArtifact(options.customProxy ?? contractName, options, logger);

      if (contractAddress) {
        logger.debug(`Custom address ${contractAddress} specified`);
        if (!artifact.networks[`${options.networkId}`]) {
          artifact.networks[`${options.networkId}`] = {};
        }
        artifact.networks[`${options.networkId}`].address = contractAddress;
      }

      enforceOrThrow(
        artifact.networks && artifact.networks[`${options.networkId}`],
        `No instance of contract ${artifact.contractName} found for network id ${options.networkId}`
      );

      const proxyImplementationAddress = await getImplementationAddress(
        artifact.networks[`${options.networkId}`].address,
        logger,
        options.provider
      );

      let status: string = proxyImplementationAddress
        ? await verifier.verifyProxyContract(artifact, contractName, proxyImplementationAddress)
        : await verifier.verifyContract(artifact);

      if (status === VerificationStatus.FAILED) {
        failedContracts.push(`${contractNameAddressPair}`);
      } else if (options.explorerUrl) {
        // Add link to verified contract on Etherscan
        const explorerUrl = `${options.explorerUrl}/${artifact.networks[`${options.networkId}`].address}#code`;
        status += `: ${explorerUrl}`;
      }
      logger.info(status);
    } catch (error: any) {
      logger.error(error.message);
      failedContracts.push(contractNameAddressPair);
    }
    logger.info();
  }

  enforce(
    failedContracts.length === 0,
    `Failed to verify ${failedContracts.length} contract(s): ${failedContracts.join(', ')}`,
    logger
  );

  logger.info(`Successfully verified ${contractNameAddressPairs.length} contract(s).`);
};

const parseConfig = async (config: TruffleConfig): Promise<Options> => {
  const provider = config.provider;
  const networkConfig = config.networks && config.networks[config.network];
  const { chainId, networkId } = await getNetwork(config, logger);

  const apiUrl = networkConfig?.verify?.apiUrl ?? API_URLS[Number(chainId)];

  enforce(apiUrl, `Etherscan has no support for network ${config.network} with chain id ${chainId}`, logger);

  const apiKey = getApiKey(config, apiUrl, logger);

  let explorerUrl = EXPLORER_URLS[Number(chainId)];
  if (networkConfig && networkConfig.verify && networkConfig.verify.explorerUrl) {
    explorerUrl = networkConfig.verify.explorerUrl;
  }

  enforce(config._.length > 1, 'No contract name(s) specified', logger);
  enforce(networkId !== '*', 'network_id bypassed with "*" in truffle-config.js.', logger);

  const projectDir = config.working_directory;
  const contractsBuildDir = config.contracts_build_directory;
  const contractsDir = config.contracts_directory;
  const customProxy = config['custom-proxy'];
  let forceConstructorArgsType, forceConstructorArgs;
  if (config.forceConstructorArgs) {
    [forceConstructorArgsType, forceConstructorArgs] = String(config.forceConstructorArgs).split(':');
    enforce(forceConstructorArgsType === 'string', 'Force constructor args must be string type', logger);
    logger.debug(`Force custructor args provided: 0x${forceConstructorArgs}`);
  }

  return {
    apiUrl,
    apiKey,
    explorerUrl,
    networkId: Number(networkId),
    chainId: Number(chainId),
    provider,
    projectDir,
    contractsBuildDir,
    contractsDir,
    forceConstructorArgs,
    customProxy,
  };
};
