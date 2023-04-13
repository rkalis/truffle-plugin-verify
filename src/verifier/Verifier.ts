import { VerificationStatus } from '../constants';
import { Artifact, Options } from '../types';

export interface Verifier {
  name: string;
  options: Options;
  getContractUrl(address: string): string | undefined;
  verifyContract(artifact: Artifact): Promise<string>;
  verifyProxyContract(
    proxyArtifact: Artifact,
    implementationName: string,
    implementationAddress: string
  ): Promise<string>;
  verifyAll(contractNameAddressPairs: string[]): Promise<void>;
}
