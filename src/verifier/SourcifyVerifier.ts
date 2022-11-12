import axios from 'axios';
import { SOURCIFY_API_URL, VerificationStatus } from '../constants';
import { Artifact, Logger, Options } from '../types';
import { deepCopy, enforceOrThrow, getArtifact, getInputJSON, getPlatform, logObject } from '../util';
import { AbstractVerifier } from './AbstractVerifier';
import { Verifier } from './Verifier';

export class SourcifyVerifier extends AbstractVerifier implements Verifier {
  name: string = 'sourcify';

  constructor(options: Options) {
    super(options);
  }

  getContractUrl(address: string) {
    return `https://sourcify.dev/#/lookup/${address}`;
  }

  async verifyContract(artifact: Artifact): Promise<VerificationStatus> {
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
}
