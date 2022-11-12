import { VerificationStatus } from '../constants';
import { Artifact, Options } from '../types';

export interface Verifier {
  name: string;
  verifyContract: (artifact: Artifact, options: Options) => Promise<VerificationStatus>;
  verifyProxyContract?: (
    proxyArtifact: Artifact,
    implementationName: string,
    implementationAddress: string,
    options: Options
  ) => Promise<VerificationStatus>;
}
