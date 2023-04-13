import axios from 'axios';
import { SOURCIFY_API_URL, VerificationStatus } from '../constants';
import { Artifact, Options } from '../types';
import { deepCopy, enforceOrThrow, getArtifact, getInputJSON, logObject } from '../util';
import { AbstractVerifier } from './AbstractVerifier';
import { Verifier } from './Verifier';

export class SourcifyVerifier extends AbstractVerifier implements Verifier {
  name: string = 'sourcify';
  private supportedChainIds: number[];

  constructor(options: Options) {
    super(options);
  }

  getContractUrl(address: string) {
    return `https://sourcify.dev/#/lookup/${address}`;
  }

  async verifyAll(contractNameAddressPairs: string[]): Promise<void> {
    await this.checkBoundaries();
    await super.verifyAll(contractNameAddressPairs);
  }

  // Note that Sourcify may indicate failed verification in through errors, but also through 200 responses
  // This is why we check both cases
  async verifyContract(artifact: Artifact): Promise<string> {
    await this.checkBoundaries();

    const inputJSON = await getInputJSON(artifact, this.options, this.logger);

    const files: { [path: string]: string } = {};
    Object.keys(inputJSON.sources).forEach((path) => {
      files[path.replace(/^.*[\\/]/, '')] = inputJSON.sources[path].content;
    });
    files['metadata.json'] = JSON.stringify(JSON.parse(artifact.metadata));

    const postQueries = {
      address: artifact.networks[`${this.options.networkId}`].address,
      chain: `${this.options.chainId}`,
      files,
    };

    try {
      this.logger.debug('Sending verify request with POST arguments:');
      logObject(this.logger, 'debug', postQueries, 2);
      const res = await axios.post(SOURCIFY_API_URL, postQueries);

      const [result] = res?.data?.result ?? [];
      this.logger.debug('Received response:');
      logObject(this.logger, 'debug', result, 2);

      if (result?.status !== 'perfect' && result?.status !== 'partial') {
        return `${VerificationStatus.FAILED}: ${result?.message}`
      }

      if (result.storageTimestamp) {
        return VerificationStatus.ALREADY_VERIFIED;
      }

      return VerificationStatus.SUCCESS;
    } catch (error: any) {
      const errorResponse = error?.response?.data;
      const errorResponseMessage = errorResponse?.message ?? errorResponse?.error;

      this.logger.debug(`Error: ${error?.message}`);
      logObject(this.logger, 'debug', error?.response?.data, 2)

      // If an error message is present in the checked response, this likely indicates a failed verification
      if (errorResponseMessage) {
        return `${VerificationStatus.FAILED}: ${errorResponseMessage}}`
      }

      // If no message was passed in the response, this likely indicates a failed connection
      throw new Error(`Could not connect to Sourcify API at url ${SOURCIFY_API_URL}`);
    }
  }

  async verifyProxyContract(
    proxyArtifact: Artifact,
    implementationName: string,
    implementationAddress: string
  ): Promise<string> {
    await this.checkBoundaries();

    if (this.options.customProxy) {
      this.logger.info(
        `Verifying custom proxy contract ${this.options.customProxy} at ${
          proxyArtifact.networks[`${this.options.networkId}`].address
        }`
      );

      await this.verifyContract(proxyArtifact);
    }

    const implementationArtifact = deepCopy(getArtifact(implementationName, this.options, this.logger));
    implementationArtifact.networks[`${this.options.networkId}`] = { address: implementationAddress };

    this.logger.info(`Verifying proxy implementation ${implementationName} at ${implementationAddress}`);
    const status = await this.verifyContract(implementationArtifact);

    return status;
  }

  private async checkBoundaries() {
    enforceOrThrow(
      await this.isSupportedChain(this.options.chainId),
      `Sourcify has no support for network ${this.options.networkName} with chain id ${this.options.chainId}`
    );
  }

  private async isSupportedChain(chainId: number) {
    const supportedChains = await this.getSupportedChains();
    return supportedChains.includes(chainId);
  }

  private async getSupportedChains() {
    if (this.supportedChainIds) return this.supportedChainIds;
    const chainsUrl = `${SOURCIFY_API_URL}chains`;

    try {
      this.logger.debug(`Fetching supported chains from ${chainsUrl}`);
      const { data } = await axios.get(chainsUrl);
      const supportedChainIds = data.filter((chain: any) => !!chain?.supported).map((chain: any) => chain.chainId);
      this.supportedChainIds = supportedChainIds;
      return supportedChainIds;
    } catch (error) {
      throw new Error(`Failed to connect to Sourcify API at url ${chainsUrl}`);
    }
  }
}
