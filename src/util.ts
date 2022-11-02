import path from 'path';
import { promisify } from 'util';
import { NULL_ADDRESS, StorageSlot } from './constants';
import { Logger, Options, TruffleConfig, TruffleProvider } from './types';

export const abort = (message: string, logger: Logger = console, code: number = 1) => {
  logger.error(message);
  process.exit(code);
};

export const enforce = (condition: any, message: string, logger?: Logger, code?: number) => {
  if (!condition) abort(message, logger, code);
};

export const enforceOrThrow = (condition: any, message: string) => {
  if (!condition) throw new Error(message);
};

/**
 * The metadata in the Truffle artifact file changes source paths on Windows. Instead of
 * D:\Hello\World.sol, it looks like /D/Hello/World.sol. When trying to read this path,
 * Windows cannot find it, since it is not a valid path. This function changes
 * /D/Hello/World.sol to D:\Hello\World.sol. This way, Windows is able to read these source
 * files. It does not change regular Unix paths, only Unixified Windows paths. It also does
 * not make any changes on platforms that aren't Windows.
 */
export const normaliseContractPath = (contractPath: string, options: Options) => {
  // Replace the 'project:' prefix that was added in Truffle v5.3.14 with the actual project path
  const absolutePath = getAbsolutePath(contractPath, options);

  // If the current platform is not Windows, the path does not need to be changed
  if (process.platform !== 'win32') return absolutePath;

  // If the contract path doesn't start with '/[A-Z]/' it is not a Unixified Windows path
  if (!absolutePath.match(/^\/[A-Z]\//i)) return absolutePath;

  const driveLetter = absolutePath.substring(1, 2);
  const normalisedContractPath = path.resolve(`${driveLetter}:/${absolutePath.substring(3)}`);

  return normalisedContractPath;
};

export const getAbsolutePath = (contractPath: string, options: Options) => {
  // Older versions of truffle already used the absolute path
  // Also node_modules contracts don't use the project: prefix
  if (!contractPath.startsWith('project:/')) return contractPath;

  const relativeContractPath = contractPath.replace('project:/', '');
  const absolutePath = path.join(options.projectDir, relativeContractPath);

  return absolutePath;
};

/**
 * If the network config includes a provider we use it to retrieve the network info
 * for the network. If that fails, we fall back to the config's network ID.
 */
export const getNetwork = async (config: TruffleConfig, logger: Logger) => {
  const send = getRpcSendFunction(config.provider);

  const fallback = { chainId: config.network_id, networkId: config.network_id };

  if (!send) {
    logger.debug('No (valid) provider configured, using config network ID as fallback');
    return fallback;
  }

  try {
    logger.debug("Retrieving network's network ID & chain ID");

    const chainIdResult = await send({ jsonrpc: '2.0', id: Date.now(), method: 'eth_chainId', params: [] });
    const networkIdResult = await send({ jsonrpc: '2.0', id: Date.now(), method: 'net_version', params: [] });

    const chainId = chainIdResult && Number.parseInt(chainIdResult.result, 16);
    const networkId = networkIdResult && Number.parseInt(networkIdResult.result, 10);

    // Throw an error that gets caught by the try-catch
    if (!networkId || !chainId) {
      throw new Error('Could not retrieve network chain ID or network ID');
    }

    return { chainId, networkId };
  } catch {
    logger.debug('Failed to retrieve network information, using configurated network ID instead');
    return fallback;
  }
};

/**
 * Check whether the address is an EIP1967 proxy and if so, return its implementation address. Note that only the LOGIC
 * variety of EIP1967 is supported, not the BEACON variety. If support for BEACON proxies is added to the openzeppelin
 * plugin, I will add it here as well
 */
export const getImplementationAddress = async (
  address: string,
  logger: Logger,
  provider?: TruffleProvider
): Promise<string | undefined> => {
  const send = getRpcSendFunction(provider);

  if (!send) {
    logger.debug('No (valid) provider configured, assuming no proxy');
    return undefined;
  }

  try {
    const { result } = await send({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'eth_getStorageAt',
      params: [address, StorageSlot.LOGIC, 'latest'],
    });

    const implementationAddress = getAddressFromStorage(result);

    if (typeof result === 'string' && implementationAddress !== NULL_ADDRESS) {
      return implementationAddress;
    }
  } catch {
    // ignored
  }

  return undefined;
};

export const getRpcSendFunction = (provider?: TruffleProvider) =>
  provider?.sendAsync
    ? promisify(provider.sendAsync.bind(provider))
    : provider?.send
    ? promisify(provider.send.bind(provider))
    : undefined;

export const deepCopy = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const getAddressFromStorage = (storage: string) => `0x${storage.slice(2).slice(-40).padStart(40, '0')}`;

export const getApiKey = (config: TruffleConfig, apiUrl: string, logger: Logger) => {
  const networkConfig = config.networks[config.network];
  if (networkConfig && networkConfig.verify && networkConfig.verify.apiKey) {
    return networkConfig.verify.apiKey;
  }

  enforce(config.api_keys, 'No API Keys provided', logger);

  const platform = new URL(apiUrl).hostname.split('.').at(-2)!;
  let subPlatform = new URL(apiUrl).hostname.split('.').at(-3)!.split('-').at(-1);

  // For some reason Etherscan uses both optimistic.etherscan.io and optimism.etherscan.io
  if (subPlatform === 'optimism') subPlatform = 'optimistic';

  const apiKey = config.api_keys![`${subPlatform}_${platform}`] ?? config.api_keys![platform];

  enforce(apiKey, `No ${platform} or ${subPlatform}_${platform} API Key provided`, logger);

  return apiKey;
};
