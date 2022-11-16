import { VerificationStatus } from '../constants';
import { Artifact, Options } from '../types';

export interface Verifier {
  name: string;
  options: Options;
  getContractUrl(address: string): string | undefined;
  verifyContract(artifact: Artifact): Promise<VerificationStatus>;
  verifyProxyContract(
    proxyArtifact: Artifact,
    implementationName: string,
    implementationAddress: string
  ): Promise<VerificationStatus>;
  verifyAll(contractNameAddressPairs: string[]): Promise<void>;
}
