import fs from 'fs';
import path from 'path';

// USAGE:
// $ yarn update-version 'X.X.X'

const version = process.argv[2];

const replaceVersion = (filePath: string, matchString: string, version: string, eol: string): void => {
  const data = fs.readFileSync(filePath, 'utf8');
  const updatedData = data.replace(new RegExp(`${matchString}.*`), `${matchString}${version}${eol}`);
  fs.writeFileSync(filePath, updatedData);
};

replaceVersion(path.join('.', 'src', 'constants.ts'), "export const VERSION = '", version, "';");
replaceVersion(path.join('.', 'package.json'), '"version": "', version, '",');
