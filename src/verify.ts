import axios from 'axios';
import delay from 'delay';
import fs from 'fs';
import path from 'path';
import querystring from 'querystring';
import tunnel from 'tunnel';
import { API_URLS, EXPLORER_URLS, RequestStatus, VerificationStatus, VERSION } from './constants';
import { Artifact, Options, TruffleConfig } from './types';
import {
  deepCopy,
  enforce,
  enforceOrThrow,
  getApiKey,
  getImplementationAddress,
  getNetwork,
  normaliseContractPath,
} from './util';

const cliLogger = require('cli-logger');
const logger = cliLogger({ level: 'info' });

module.exports = async (config: TruffleConfig) => {
  // Set debug logging
  if (config.debug) logger.level('debug');
  logger.debug('DEBUG logging is turned ON');
  logger.debug(`Running truffle-plugin-verify v${VERSION}`);

  if (config.verify && config.verify.proxy) {
    const { proxy } = config.verify;
    logger.debug('Enable verify proxy ', proxy);
    axios.interceptors.request.use((conf) => {
      conf.httpsAgent = tunnel.httpsOverHttp({ proxy });
      conf.proxy = false;
      return conf;
    });
  }

  const options = await parseConfig(config);

  // Verify each contract
  const contractNameAddressPairs = config._.slice(1);

  // Track which contracts failed verification
  const failedContracts = [];
  for (const contractNameAddressPair of contractNameAddressPairs) {
    logger.info(`Verifying ${contractNameAddressPair}`);
    try {
      const [contractName, contractAddress] = contractNameAddressPair.split('@');

      // If we pass a custom proxy contract, we use its artifact to trigger proxy verification
      const artifact = getArtifact(options.customProxy ?? contractName, options);

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

      let status = proxyImplementationAddress
        ? await verifyProxyContract(artifact, contractName, proxyImplementationAddress, options)
        : await verifyContract(artifact, options);

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

  let apiUrl = API_URLS[chainId];
  if (networkConfig && networkConfig.verify && networkConfig.verify.apiUrl) {
    apiUrl = networkConfig.verify.apiUrl;
  }

  enforce(apiUrl, `Etherscan has no support for network ${config.network} with chain id ${chainId}`, logger);

  const apiKey = getApiKey(config, apiUrl, logger);

  let explorerUrl = EXPLORER_URLS[chainId];
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
    networkId,
    chainId,
    provider,
    projectDir,
    contractsBuildDir,
    contractsDir,
    forceConstructorArgs,
    customProxy,
  };
};

const getArtifact = (contractName: string, options: Options) => {
  const artifactPath = path.resolve(options.contractsBuildDir, `${contractName}.json`);

  logger.debug(`Reading artifact file at ${artifactPath}`);
  enforceOrThrow(fs.existsSync(artifactPath), `Could not find ${contractName} artifact at ${artifactPath}`);

  // Stringify + parse to make a deep copy (to avoid bugs with PR #19)
  return JSON.parse(JSON.stringify(require(artifactPath)));
};

const verifyContract = async (artifact: Artifact, options: Options) => {
  const res = await sendVerifyRequest(artifact, options);
  enforceOrThrow(res.data, `Failed to connect to Etherscan API at url ${options.apiUrl}`);

  if (res.data.result === VerificationStatus.ALREADY_VERIFIED) {
    return VerificationStatus.ALREADY_VERIFIED;
  }

  enforceOrThrow(res.data.status === RequestStatus.OK, res.data.result);
  return verificationStatus(res.data.result, options);
};

const sendVerifyRequest = async (artifact: Artifact, options: Options) => {
  const compilerVersion = extractCompilerVersion(artifact);
  const encodedConstructorArgs =
    options.forceConstructorArgs !== undefined
      ? options.forceConstructorArgs
      : await fetchConstructorValues(artifact, options);
  const inputJSON = getInputJSON(artifact, options);

  // Remove the 'project:' prefix that was added in Truffle v5.3.14
  const relativeFilePath = artifact.ast.absolutePath.replace('project:', '');

  const postQueries = {
    apikey: options.apiKey,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: artifact.networks[`${options.networkId}`].address,
    sourceCode: JSON.stringify(inputJSON),
    codeformat: 'solidity-standard-json-input',
    contractname: `${relativeFilePath}:${artifact.contractName}`,
    compilerversion: compilerVersion,
    constructorArguements: encodedConstructorArgs,
  };

  try {
    logger.debug('Sending verify request with POST arguments:');
    logger.debug(JSON.stringify(postQueries, null, 2));
    return await axios.post(options.apiUrl, querystring.stringify(postQueries));
  } catch (error: any) {
    logger.debug(error.message);
    throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`);
  }
};

const extractCompilerVersion = (artifact: Artifact) => {
  const metadata = JSON.parse(artifact.metadata);

  const compilerVersion = `v${metadata.compiler.version}`;

  return compilerVersion;
};

const fetchConstructorValues = async (artifact: Artifact, options: Options) => {
  const contractAddress = artifact.networks[`${options.networkId}`].address;

  // Fetch the contract creation transaction to extract the input data
  let res;
  try {
    const qs = querystring.stringify({
      apiKey: options.apiKey,
      module: 'account',
      action: 'txlist',
      address: contractAddress,
      page: 1,
      sort: 'asc',
      offset: 1,
    });
    const url = `${options.apiUrl}?${qs}`;
    logger.debug(`Retrieving constructor parameters from ${url}`);
    res = await axios.get(url);
  } catch (error: any) {
    logger.debug(error.message);
    throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`);
  }

  // The last part of the transaction data is the constructor arguments
  // If it can't be accessed for any reason, try using empty constructor arguments
  if (res.data && res.data.status === RequestStatus.OK && res.data.result[0] !== undefined) {
    const constructorArgs = res.data.result[0].input.substring(artifact.bytecode.length);
    logger.debug(`Constructor parameters retrieved: 0x${constructorArgs}`);
    return constructorArgs;
  } else {
    logger.debug('Could not retrieve constructor parameters, using empty parameters as fallback');
    return '';
  }
};

const getInputJSON = (artifact: Artifact, options: Options) => {
  const metadata = JSON.parse(artifact.metadata);
  const libraries = getLibraries(artifact, options);

  // Sort the source files so that the "main" contract is on top
  const orderedSources = Object.keys(metadata.sources)
    .reverse()
    .sort((a, b) => {
      if (a === artifact.ast.absolutePath) return -1;
      if (b === artifact.ast.absolutePath) return 1;
      return 0;
    });

  const sources: { [contractPath: string]: { content: string } } = {};
  for (const contractPath of orderedSources) {
    // If we're on Windows we need to de-Unixify the path so that Windows can read the file
    // We also need to replace the 'project:' prefix so that the file can be read
    const normalisedContractPath = normaliseContractPath(contractPath, options);
    const absolutePath = require.resolve(normalisedContractPath, { paths: [options.projectDir] });
    const content = fs.readFileSync(absolutePath, 'utf8');

    // Remove the 'project:' prefix that was added in Truffle v5.3.14
    const relativeContractPath = contractPath.replace('project:', '');

    sources[relativeContractPath] = { content };
  }

  const inputJSON = {
    language: metadata.language,
    sources,
    settings: {
      remappings: metadata.settings.remappings,
      optimizer: metadata.settings.optimizer,
      evmVersion: metadata.settings.evmVersion,
      libraries,
    },
  };

  return inputJSON;
};

const getLibraries = (artifact: Artifact, options: Options) => {
  const libraries: { [fileName: string]: { [libraryName: string]: string } } = {
    // Example data structure of libraries object in Standard Input JSON
    // 'ConvertLib.sol': {
    //   'ConvertLib': '0x...',
    //   'OtherLibInSameSourceFile': '0x...'
    // }
  };

  const links = artifact.networks[`${options.networkId}`].links || {};

  for (const libraryName in links) {
    // Retrieve the source path for this library
    const libraryArtifact = getArtifact(libraryName, options);

    // Remove the 'project:' prefix that was added in Truffle v5.3.14
    const librarySourceFile = libraryArtifact.ast.absolutePath.replace('project:', '');

    // Add the library to the object of libraries for this source path
    const librariesForSourceFile = libraries[librarySourceFile] || {};
    librariesForSourceFile[libraryName] = links[libraryName];
    libraries[librarySourceFile] = librariesForSourceFile;
  }

  return libraries;
};

const verificationStatus = async (guid: string, options: Options, action: string = 'checkverifystatus') => {
  logger.debug(`Checking status of verification request ${guid}`);
  // Retry API call every second until status is no longer pending
  while (true) {
    await delay(1000);

    try {
      const qs = querystring.stringify({
        apiKey: options.apiKey,
        module: 'contract',
        action,
        guid,
      });
      const verificationResult = await axios.get(`${options.apiUrl}?${qs}`);
      if (verificationResult.data.result !== VerificationStatus.PENDING) {
        return verificationResult.data.result;
      }
    } catch (error: any) {
      logger.debug(error.message);
      throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`);
    }
  }
};

const verifyProxyContract = async (
  proxyArtifact: Artifact,
  implementationName: string,
  implementationAddress: string,
  options: Options
) => {
  if (options.customProxy) {
    logger.info(
      `Verifying custom proxy contract ${options.customProxy} at ${
        proxyArtifact.networks[`${options.networkId}`].address
      }`
    );
    const status = await verifyContract(proxyArtifact, options);
    if (status === VerificationStatus.FAILED) return status;
  }

  const implementationArtifact = deepCopy(getArtifact(implementationName, options));
  implementationArtifact.networks[`${options.networkId}`] = {
    address: implementationAddress,
  };

  logger.info(`Verifying proxy implementation ${implementationName} at ${implementationAddress}`);
  const status = await verifyContract(implementationArtifact, options);

  if (
    [
      VerificationStatus.SUCCESS,
      VerificationStatus.ALREADY_VERIFIED,
      VerificationStatus.AUTOMATICALLY_VERIFIED,
    ].includes(status)
  ) {
    logger.info('Linking proxy and implementation addresses');
    await verifyProxy(proxyArtifact.networks[`${options.networkId}`].address, options);
  }

  return status;
};

const verifyProxy = async (proxyAddress: string, options: Options) => {
  const res = await sendProxyVerifyRequest(proxyAddress, options);
  enforceOrThrow(res.data, `Failed to connect to Etherscan API at url ${options.apiUrl}`);
  enforceOrThrow(res.data.status === RequestStatus.OK, res.data.result);
  const status = await verificationStatus(res.data.result, options, 'checkproxyverification');
  logger.debug(status);
};

const sendProxyVerifyRequest = async (address: string, options: Options) => {
  const postQueries = { address };
  const qs = querystring.stringify({
    apiKey: options.apiKey,
    module: 'contract',
    action: 'verifyproxycontract',
  });

  try {
    logger.debug(`Sending verify proxy request to ${options.apiUrl}?${qs} with POST arguments:`);
    logger.debug(JSON.stringify(postQueries, null, 2));
    return await axios.post(`${options.apiUrl}?${qs}`, querystring.stringify(postQueries));
  } catch (error: any) {
    logger.info(error.message);
    throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`);
  }
};
