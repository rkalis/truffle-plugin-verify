import { INDENT, VerificationStatus } from '../constants';
import { Artifact, Logger, Options } from '../types';
import { enforce, enforceOrThrow, getArtifact, getImplementationAddress } from '../util';

const cliLogger = require('cli-logger');

export abstract class AbstractVerifier {
  abstract name: string;

  abstract getContractUrl(address: string): string | undefined;
  abstract verifyContract(artifact: Artifact): Promise<VerificationStatus>;
  abstract verifyProxyContract(
    proxyArtifact: Artifact,
    implementationName: string,
    implementationAddress: string
  ): Promise<VerificationStatus>;

  logger: Logger;

  constructor(public options: Options) {
    this.logger = cliLogger({ level: 'info', prefix: () => INDENT });
    if (options.debug) this.logger.level('debug');
  }

  async verifyAll(contractNameAddressPairs: string[]): Promise<void> {
    const failedContracts = [];
    for (const contractNameAddressPair of contractNameAddressPairs) {
      this.logger.info(`Verifying ${contractNameAddressPair}`);
      try {
        const [contractName, contractAddress] = contractNameAddressPair.split('@');

        // If we pass a custom proxy contract, we use its artifact to trigger proxy verification
        const artifact = getArtifact(this.options.customProxy ?? contractName, this.options, this.logger);

        if (contractAddress) {
          this.logger.debug(`Custom address ${contractAddress} specified`);
          artifact.networks[`${this.options.networkId}`] = {
            ...(artifact.networks[`${this.options.networkId}`] ?? {}),
            address: contractAddress
          }
        }

        enforceOrThrow(
          artifact.networks && artifact.networks[`${this.options.networkId}`],
          `No instance of contract ${artifact.contractName} found for network id ${this.options.networkId}`
        );

        const proxyImplementationAddress = await getImplementationAddress(
          artifact.networks[`${this.options.networkId}`].address,
          this.logger,
          this.options.provider
        );

        const status: string = proxyImplementationAddress
          ? await this.verifyProxyContract(artifact, contractName, proxyImplementationAddress)
          : await this.verifyContract(artifact);

        if (status === VerificationStatus.FAILED) {
          failedContracts.push(`${contractNameAddressPair}`);
        }

        const contractUrl = this.getContractUrl(artifact.networks[`${this.options.networkId}`].address);
        const statusMessage =
          status !== VerificationStatus.FAILED && contractUrl ? `${status}: ${contractUrl}` : status;
        this.logger.info(statusMessage);
      } catch (error: any) {
        this.logger.error(error.message);
        failedContracts.push(contractNameAddressPair);
      }
      this.logger.info();
    }

    if (failedContracts.length === 0) {
      this.logger.info(`Successfully verified ${contractNameAddressPairs.length} contract(s).`);
    } else {
      this.logger.info(`Failed to verify ${failedContracts.length} contract(s): ${failedContracts.join(', ')}`)
    }
  }
}
