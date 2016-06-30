
// eslint-disable-next-line no-shadow
import Promise from 'pinkie-promise';
// eslint-disable-next-line no-unused-vars
import readInstalled from 'read-installed';
import semver from 'semver';

export default function verifyPkgIsInstalled(folder, pkgName, versionLimit) {
  return new Promise((resolve, reject) => {
    readInstalled(folder, { dev: true, depth: 1 }, (readErr, installed) => {
      let pkgInfo;

      if (readErr) {
        return reject(readErr);
      }

      if (!installed || !installed.dependencies) {
        return resolve(false);
      }

      pkgInfo = installed.dependencies[pkgName];

      if (!pkgInfo) {
        return resolve(false);
      }

      if (versionLimit != null) {
        return resolve(semver.satisfies(pkgInfo.version, versionLimit));
      }

      resolve(true);
    });
  });
}
