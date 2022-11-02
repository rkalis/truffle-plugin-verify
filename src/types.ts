export interface Logger {
  info: (message: any) => void;
  debug: (message: any) => void;
  error: (message: any) => void;
}

// Incomplete typing
export interface Artifact {
  contractName: string;
  metadata: string;
  bytecode: string;
  ast: {
    absolutePath: string;
  };
  networks: {
    [networkId: string]: {
      address: string;
      links: {
        [libraryName: string]: string;
      };
    };
  };
}

// Incomplete typing
export interface TruffleConfig {
  // truffle-config.js
  networks: { [networkName: string]: TruffleNetworkConfig };

  // Custom truffle-config.js
  api_keys?: { [platformName: string]: string };
  verify?: {
    proxy?: {
      host: string;
      port: number;
    };
  };

  // Directories
  working_directory: string;
  contracts_directory: string;
  contracts_build_directory: string;

  // Network
  network: string;
  network_id: string;
  provider?: TruffleProvider;

  // CLI args
  _: string[];
  'custom-proxy'?: string;
  forceConstructorArgs?: string;
  debug?: boolean;
}

// Incomplete typing
export interface TruffleNetworkConfig {
  verify?: {
    apiKey: string;
    apiUrl: string;
    explorerUrl: string;
  };
}

// Incomplete typing
export interface TruffleProvider {
  send?: any;
  sendAsync?: any;
}

export interface Options {
  apiUrl: string;
  apiKey: string;
  explorerUrl: string;
  networkId: number;
  chainId: number;
  provider?: TruffleProvider;
  projectDir: string;
  contractsBuildDir: string;
  contractsDir: string;
  forceConstructorArgs?: string;
  customProxy?: string;
}
