import axios from 'axios';
import delay from 'delay';
import querystring from 'querystring';
import { RequestStatus, VerificationStatus } from '../constants';
import { Artifact, Logger, Options } from '../types';
import { deepCopy, enforceOrThrow, extractCompilerVersion, getArtifact, getInputJSON, getPlatform } from '../util';
import { AbstractVerifier } from './AbstractVerifier';
import { Verifier } from './Verifier';

export class EtherscanVerifier extends AbstractVerifier implements Verifier {
  name: string;

  constructor(public logger: Logger, public options: Options) {
    super();
    this.name = getPlatform(options.apiUrl).platform;
  }

  getContractUrl(address: string) {
    return `${this.options.explorerUrl}/${address}#code`;
  }

  async verifyContract(artifact: Artifact): Promise<VerificationStatus> {
    const res = await this.sendVerifyRequest(artifact);
    enforceOrThrow(res.data, `Failed to connect to Etherscan API at url ${this.options.apiUrl}`);

    if (res.data.result === VerificationStatus.ALREADY_VERIFIED) {
      return VerificationStatus.ALREADY_VERIFIED;
    }

    enforceOrThrow(res.data.status === RequestStatus.OK, res.data.result);
    return this.verificationStatus(res.data.result);
  }

  async verifyProxyContract(proxyArtifact: Artifact, implementationName: string, implementationAddress: string) {
    if (this.options.customProxy) {
      this.logger.info(
        `Verifying custom proxy contract ${this.options.customProxy} at ${
          proxyArtifact.networks[`${this.options.networkId}`].address
        }`
      );
      const status = await this.verifyContract(proxyArtifact);
      if (status === VerificationStatus.FAILED) return status;
    }

    const implementationArtifact = deepCopy(getArtifact(implementationName, this.options, this.logger));
    implementationArtifact.networks[`${this.options.networkId}`] = {
      address: implementationAddress,
    };

    this.logger.info(`Verifying proxy implementation ${implementationName} at ${implementationAddress}`);
    const status = await this.verifyContract(implementationArtifact);

    if (
      [
        VerificationStatus.SUCCESS,
        VerificationStatus.ALREADY_VERIFIED,
        VerificationStatus.AUTOMATICALLY_VERIFIED,
      ].includes(status)
    ) {
      this.logger.info('Linking proxy and implementation addresses');
      await this.verifyProxy(proxyArtifact.networks[`${this.options.networkId}`].address);
    }

    return status;
  }

  private async sendVerifyRequest(artifact: Artifact) {
    const compilerVersion = extractCompilerVersion(artifact);
    const encodedConstructorArgs =
      this.options.forceConstructorArgs !== undefined
        ? this.options.forceConstructorArgs
        : await this.fetchConstructorValues(artifact);
    const inputJSON = getInputJSON(artifact, this.options, this.logger);

    // Remove the 'project:' prefix that was added in Truffle v5.3.14
    const relativeFilePath = artifact.ast.absolutePath.replace('project:', '');

    const postQueries = {
      apikey: this.options.apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: artifact.networks[`${this.options.networkId}`].address,
      sourceCode: JSON.stringify(inputJSON),
      codeformat: 'solidity-standard-json-input',
      contractname: `${relativeFilePath}:${artifact.contractName}`,
      compilerversion: compilerVersion,
      constructorArguements: encodedConstructorArgs,
    };

    try {
      this.logger.debug('Sending verify request with POST arguments:');
      this.logger.debug(JSON.stringify(postQueries, null, 2));
      return await axios.post(this.options.apiUrl, querystring.stringify(postQueries));
    } catch (error: any) {
      this.logger.debug(error.message);
      throw new Error(`Failed to connect to Etherscan API at url ${this.options.apiUrl}`);
    }
  }

  private async fetchConstructorValues(artifact: Artifact) {
    const contractAddress = artifact.networks[`${this.options.networkId}`].address;

    // Fetch the contract creation transaction to extract the input data
    let res;
    try {
      const qs = querystring.stringify({
        apiKey: this.options.apiKey,
        module: 'account',
        action: 'txlist',
        address: contractAddress,
        page: 1,
        sort: 'asc',
        offset: 1,
      });
      const url = `${this.options.apiUrl}?${qs}`;
      this.logger.debug(`Retrieving constructor parameters from ${url}`);
      res = await axios.get(url);
    } catch (error: any) {
      this.logger.debug(error.message);
      throw new Error(`Failed to connect to Etherscan API at url ${this.options.apiUrl}`);
    }

    // The last part of the transaction data is the constructor arguments
    // If it can't be accessed for any reason, try using empty constructor arguments
    if (res.data && res.data.status === RequestStatus.OK && res.data.result[0] !== undefined) {
      const constructorArgs = res.data.result[0].input.substring(artifact.bytecode.length);
      this.logger.debug(`Constructor parameters retrieved: 0x${constructorArgs}`);
      return constructorArgs;
    } else {
      this.logger.debug('Could not retrieve constructor parameters, using empty parameters as fallback');
      return '';
    }
  }

  private async verificationStatus(guid: string, action: string = 'checkverifystatus') {
    this.logger.debug(`Checking status of verification request ${guid}`);
    // Retry API call every second until status is no longer pending
    while (true) {
      await delay(1000);

      try {
        const qs = querystring.stringify({
          apiKey: this.options.apiKey,
          module: 'contract',
          action,
          guid,
        });
        const verificationResult = await axios.get(`${this.options.apiUrl}?${qs}`);
        if (verificationResult.data.result !== VerificationStatus.PENDING) {
          return verificationResult.data.result;
        }
      } catch (error: any) {
        this.logger.debug(error.message);
        throw new Error(`Failed to connect to Etherscan API at url ${this.options.apiUrl}`);
      }
    }
  }

  private async sendProxyVerifyRequest(address: string) {
    const postQueries = { address };
    const qs = querystring.stringify({
      apiKey: this.options.apiKey,
      module: 'contract',
      action: 'verifyproxycontract',
    });

    try {
      this.logger.debug(`Sending verify proxy request to ${this.options.apiUrl}?${qs} with POST arguments:`);
      this.logger.debug(JSON.stringify(postQueries, null, 2));
      return await axios.post(`${this.options.apiUrl}?${qs}`, querystring.stringify(postQueries));
    } catch (error: any) {
      this.logger.info(error.message);
      throw new Error(`Failed to connect to Etherscan API at url ${this.options.apiUrl}`);
    }
  }

  private async verifyProxy(proxyAddress: string) {
    const res = await this.sendProxyVerifyRequest(proxyAddress);
    enforceOrThrow(res.data, `Failed to connect to Etherscan API at url ${this.options.apiUrl}`);
    enforceOrThrow(res.data.status === RequestStatus.OK, res.data.result);
    const status = await this.verificationStatus(res.data.result, 'checkproxyverification');
    this.logger.debug(status);
  }
}
