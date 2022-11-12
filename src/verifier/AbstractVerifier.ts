import { VerificationStatus } from '../constants';
import { Artifact, Logger, Options } from '../types';
import { enforce, enforceOrThrow, getArtifact, getImplementationAddress } from '../util';

export abstract class AbstractVerifier {
  abstract name: string;
  abstract logger: Logger;
  abstract options: Options;

  abstract getContractUrl(address: string): string | undefined;
  abstract verifyContract(artifact: Artifact): Promise<VerificationStatus>;
  abstract verifyProxyContract(
    proxyArtifact: Artifact,
    implementationName: string,
    implementationAddress: string
  ): Promise<VerificationStatus>;

  async verifyAll(contractNameAddressPairs: string[]) {
    const failedContracts = [];
    for (const contractNameAddressPair of contractNameAddressPairs) {
      this.logger.info(`Verifying ${contractNameAddressPair}`);
      try {
        const [contractName, contractAddress] = contractNameAddressPair.split('@');

        // If we pass a custom proxy contract, we use its artifact to trigger proxy verification
        const artifact = getArtifact(this.options.customProxy ?? contractName, this.options, this.logger);

        if (contractAddress) {
          this.logger.debug(`Custom address ${contractAddress} specified`);
          if (!artifact.networks[`${this.options.networkId}`]) {
            artifact.networks[`${this.options.networkId}`] = {};
          }
          artifact.networks[`${this.options.networkId}`].address = contractAddress;
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

    enforce(
      failedContracts.length === 0,
      `Failed to verify ${failedContracts.length} contract(s): ${failedContracts.join(', ')}`,
      this.logger
    );

    this.logger.info(`Successfully verified ${contractNameAddressPairs.length} contract(s).`);
  }
}
