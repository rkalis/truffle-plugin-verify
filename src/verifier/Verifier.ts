import { VerificationStatus } from '../constants';
import { Artifact } from '../types';

export interface Verifier {
  name: string;
  verifyContract(artifact: Artifact): Promise<VerificationStatus>;
  verifyProxyContract(
    proxyArtifact: Artifact,
    implementationName: string,
    implementationAddress: string
  ): Promise<VerificationStatus>;
}
