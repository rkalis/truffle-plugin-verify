import TruffleResolver from '@truffle/resolver';
import axios from 'axios';
import tunnel from 'tunnel';
import { API_URLS, EXPLORER_URLS, INDENT, SUPPORTED_VERIFIERS, VERSION } from './constants';
import { Logger, Options, TruffleConfig } from './types';
import { enforce, getApiKey, getNetwork } from './util';
import { EtherscanVerifier } from './verifier/EtherscanVerifier';
import { SourcifyVerifier } from './verifier/SourcifyVerifier';
import { Verifier } from './verifier/Verifier';

const cliLogger = require('cli-logger');
const logger: Logger = cliLogger({ level: 'info' });

module.exports = async (config: TruffleConfig): Promise<void> => {
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
  const verifiers = getVerifiers(config, options);

  // Verify each contract
  const contractNameAddressPairs = config._.slice(1);
  for (const verifier of verifiers) {
    logger.info(`Verifying contracts on ${verifier.name}`);
    try {
      await verifier.verifyAll(contractNameAddressPairs);
    } catch (error: any) {
      logger.error(`${INDENT}${error.message}`);
    }
  }
};

const parseConfig = async (config: TruffleConfig): Promise<Options> => {
  const networkConfig = config.networks?.[config.network];
  const { chainId, networkId } = await getNetwork(config, logger);

  const explorerUrl = networkConfig?.verify?.explorerUrl ?? EXPLORER_URLS[Number(chainId)];
  const apiUrl = networkConfig?.verify?.apiUrl ?? API_URLS[Number(chainId)];
  const apiKey = getApiKey(config, apiUrl);

  enforce(config._.length > 1, 'No contract name(s) specified', logger);
  enforce(networkId !== '*', 'network_id bypassed with "*" in truffle-config.js.', logger);

  const projectDir = config.working_directory;
  const customProxy = config['custom-proxy'];
  let forceConstructorArgsType, forceConstructorArgs;
  if (config.forceConstructorArgs) {
    [forceConstructorArgsType, forceConstructorArgs] = String(config.forceConstructorArgs).split(':');
    enforce(forceConstructorArgsType === 'string', 'Force constructor args must be string type', logger);
    logger.debug(`Force custructor args provided: 0x${forceConstructorArgs}`);
  }

  const resolver = new TruffleResolver(config);

  return {
    apiUrl,
    apiKey,
    explorerUrl,
    networkId: Number(networkId),
    chainId: Number(chainId),
    networkName: config.network,
    provider: config.provider,
    projectDir,
    forceConstructorArgs,
    customProxy,
    debug: config.debug,
    resolver,
  };
};

const getVerifiers = (config: TruffleConfig, options: Options): Verifier[] => {
  const allVerifiersString = SUPPORTED_VERIFIERS.join(',');
  const verifierNameString = config.verifiers || allVerifiersString;
  const verifierNames = verifierNameString.split(',').map((name) => name.trim());
  const uniqueVerifierNames = verifierNames.filter((name, i) => verifierNames.indexOf(name) === i);

  const verifiers: Verifier[] = [];
  for (const name of uniqueVerifierNames) {
    enforce(
      SUPPORTED_VERIFIERS.includes(name),
      `truffle-plugin-verify has no support for verifier ${name}, supported verifiers: ${allVerifiersString}`
    );

    if (name === 'etherscan') {
      verifiers.push(new EtherscanVerifier(options));
    }

    if (name === 'sourcify') {
      verifiers.push(new SourcifyVerifier(options));
    }
  }

  return verifiers;
};
