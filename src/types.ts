import type TruffleResolver from "@truffle/resolver";

export interface Logger extends Console {
  level(level: string): void;
  prefix(prefix: string): void;
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
      links?: {
        [libraryName: string]: string | undefined;
      };
    };
  };
}

// Incomplete typing
export interface TruffleConfig {
  // truffle-config.js
  networks: { [networkName: string]: TruffleNetworkConfig | undefined };

  // Custom truffle-config.js
  api_keys?: { [platformName: string]: string | undefined };
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
  verifiers?: string;
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
  apiUrl?: string;
  apiKey?: string;
  explorerUrl?: string;
  networkId: number;
  chainId: number;
  networkName: string;
  provider?: TruffleProvider;
  projectDir: string;
  contractsBuildDir: string;
  contractsDir: string;
  forceConstructorArgs?: string;
  customProxy?: string;
  debug?: boolean;
  resolver: TruffleResolver;
}

export interface RetrievedNetworkInfo {
  chainId: string;
  networkId: string;
}

export interface InputJson {
  language: string;
  sources: {
    [path: string]: {
      content: string;
    };
  };
  settings: {
    libraries: Libraries;
    [key: string]: any;
  };
}

export interface Libraries {
  [fileName: string]: {
    [libraryName: string]: string;
  };
}
