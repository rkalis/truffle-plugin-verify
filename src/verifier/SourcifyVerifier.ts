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

  async verifyContract(artifact: Artifact): Promise<VerificationStatus> {
    await this.checkBoundaries();

    const res = await this.sendVerifyRequest(artifact);
    enforceOrThrow(res.data?.result?.length === 1, `Failed to connect to Sourcify API at url ${SOURCIFY_API_URL}`);

    const [contract] = res.data.result;

    if (contract.storageTimestamp) {
      return VerificationStatus.ALREADY_VERIFIED;
    }

    return VerificationStatus.SUCCESS;
  }

  async verifyProxyContract(
    proxyArtifact: Artifact,
    implementationName: string,
    implementationAddress: string
  ): Promise<VerificationStatus> {
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

  private async sendVerifyRequest(artifact: Artifact) {
    const inputJSON = getInputJSON(artifact, this.options, this.logger);

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
      return await axios.post(SOURCIFY_API_URL, postQueries);
    } catch (error: any) {
      this.logger.debug(error.message);
      this.logger.debug(error.response.data.message);
      throw new Error(`Failed to connect to Sourcify API at url ${SOURCIFY_API_URL}`);
    }
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
    const chainsUrl = `${SOURCIFY_API_URL}chains`

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
