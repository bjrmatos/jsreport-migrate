
/* eslint-disable no-console */
import path from 'path';
import fs from 'fs';
import assign from 'object-assign';
import chalk from 'chalk';
import mkdirp from 'mkdirp';
import Promise from 'pinkie-promise'; // eslint-disable-line no-shadow
import pmap from 'promise-map';
import pfilter from 'promise-filter';
import pify from 'pify';
import getTimestampFromNedbDate from '../utils/getTimestampFromNedbDate';
import spawnAsync from '../utils/spawnAsync';
import verifyPkgIsInstalled from '../verifyPkgIsInstalled';

const mkdirPromise = pify(mkdirp, Promise);
const readDir = pify(fs.readdir, Promise);
const readFile = pify(fs.readFile, Promise);
const writeFile = pify(fs.writeFile, Promise);
const unlinkFile = pify(fs.unlink, Promise);
const getFileStat = pify(fs.stat, Promise);
const log = (msg) => console.log(chalk.blue(msg));

const migration = (basePath) => {
  const minimalVersion = '0.10.0',
        minimalVersionRage = `>=${minimalVersion}`;

  log('checking if jsreport is installed..');

  // requires jsreport >= 0.10
  return verifyPkgIsInstalled(basePath, 'jsreport', minimalVersionRage).then((isInstalled) => {
    let pathToJsreportConfig,
        jsreportConfig;

    if (!isInstalled) {
      return log(
        `jsreport is not installed or installed version is not supported (must be ${minimalVersionRage}), stopping migration`
      );
    }

    log('looking for jsreport `dev.config.json` config file..');

    try {
      pathToJsreportConfig = path.join(basePath, 'dev.config.json');

      jsreportConfig = {
        name: 'dev.config.json',
        path: pathToJsreportConfig,
        content: JSON.parse(fs.readFileSync(pathToJsreportConfig).toString())
      };
    } catch (readConfigErr) {
      log('jsreport config [dev.config.json] is not found');
    }

    if (!jsreportConfig) {
      log('looking for jsreport `prod.config.json` config file..');

      try {
        pathToJsreportConfig = path.join(basePath, 'prod.config.json');

        jsreportConfig = {
          name: 'prod.config.json',
          path: pathToJsreportConfig,
          content: JSON.parse(fs.readFileSync(pathToJsreportConfig).toString()),
          createDevConfig: true
        };
      } catch (readConfigErr) {
        log('jsreport config [prod.config.json] is not found');
      }
    }

    if (!jsreportConfig || !jsreportConfig.content || !jsreportConfig.content.connectionString) {
      return log('invalid jsreport config, couldn\'t find configuration file for jsreport');
    }

    if (jsreportConfig.content.connectionString.name !== 'neDB') {
      return log('this migration only works for projects with embedded-store');
    }

    log('running migration scripts');

    return Promise.all([
      migrateData(basePath),
      migrateScripts(basePath),
      migrateImages(),
      migrateTemplates(basePath),
      updateJsreportConnection(jsreportConfig)
    ]);
  }).then(() => {
    log('installing `jsreport-fs-store`..');

    // installing jsreport-fs-store
    return spawnAsync('npm', ['install', 'jsreport-fs-store', '--save'], {
      stdio: 'inherit'
    }).then(() => {
      log('`jsreport-fs-store` installed');
    }).catch((installErr) => {
      console.error(installErr);
      log('the installion of `jsreport-fs-store` has failed, try to run `npm install jsreport-fs-store --save` manually');
    });
  });
};

function migrateData(basePath) {
  const pathToData = path.join(basePath, 'data/data');

  return (
    readNeDBFilesInDirectory(pathToData)
    .then(pmap(dataFile => {
      let configData = {},
          pathToDirDataFile,
          pathToDataConfigFile,
          pathToDataContentFile;

      log(`migrating data file [${dataFile.absolutePath}]..`);

      if (dataFile.content.name == null || dataFile.content.name === '') {
        return Promise.reject(new Error(`Invalid name for data file [${dataFile.name}]`));
      }

      // for each data file generate two files (config.json y dataJson.json)
      pathToDirDataFile = path.join(dataFile.basePath, dataFile.content.name);
      pathToDataConfigFile = path.join(pathToDirDataFile, 'config.json');
      pathToDataContentFile = path.join(pathToDirDataFile, 'dataJson.json');

      configData.shortid = dataFile.content.shortid;
      configData._id = dataFile.content._id;

      configData.creationDate = {
        $$date: getTimestampFromNedbDate(dataFile.content.creationDate)
      };

      configData.modificationDate = {
        $$date: getTimestampFromNedbDate(dataFile.content.modificationDate)
      };

      return (
        unlinkFile(dataFile.absolutePath)
        .then(() => {
          let saveOperations = [];

          saveOperations.push(
            saveNewFile(pathToDataConfigFile, JSON.stringify(configData, undefined, 2))
          );

          saveOperations.push(
            saveNewFile(pathToDataContentFile, JSON.stringify(JSON.parse(dataFile.content.dataJson), undefined, 2))
          );

          return Promise.all(saveOperations);
        })
      );
    }))
  );
}

function migrateScripts(basePath) {
  const pathToScripts = path.join(basePath, 'data/scripts');

  return (
    readNeDBFilesInDirectory(pathToScripts)
    .then(pmap(dataFile => {
      let configData = {},
          pathToDirDataFile,
          pathToDataConfigFile,
          pathToDataContentFile;

      log(`migrating script file [${dataFile.absolutePath}]..`);

      if (dataFile.content.name == null || dataFile.content.name === '') {
        return Promise.reject(new Error(`Invalid name for data file [${dataFile.name}]`));
      }

      // for each data file generate two files (config.json y content.js)
      pathToDirDataFile = path.join(dataFile.basePath, dataFile.content.name);
      pathToDataConfigFile = path.join(pathToDirDataFile, 'config.json');
      pathToDataContentFile = path.join(pathToDirDataFile, 'content.js');

      configData.shortid = dataFile.content.shortid;
      configData._id = dataFile.content._id;

      configData.creationDate = {
        $$date: getTimestampFromNedbDate(dataFile.content.creationDate)
      };

      configData.modificationDate = {
        $$date: getTimestampFromNedbDate(dataFile.content.modificationDate)
      };

      return (
        unlinkFile(dataFile.absolutePath)
        .then(() => {
          let saveOperations = [];

          saveOperations.push(
            saveNewFile(pathToDataConfigFile, JSON.stringify(configData, undefined, 2))
          );

          saveOperations.push(
            saveNewFile(pathToDataContentFile, dataFile.content.content)
          );

          return Promise.all(saveOperations);
        })
      );
    }))
  );
}

function migrateTemplates() {
  return Promise.resolve(null);
}

function migrateImages() {
  return Promise.resolve(null);
}

/**
 * Updates existing jsreport configuration to `fs` store, also
 * it creates a `dev.config.json` file if it is not found previously
 */
function updateJsreportConnection(jsreportConfig) {
  const pathConfig = jsreportConfig.path,
        newConfig = assign({}, jsreportConfig.content),
        basePathConfig = path.dirname(pathConfig);

  log('updating jsreport connection to fs store');

  newConfig.connectionString = assign({}, jsreportConfig.content.connectionString, { name: 'fs' });

  fs.writeFileSync(pathConfig, JSON.stringify(newConfig, undefined, 2));

  if (jsreportConfig.createDevConfig === true) {
    log('creating dev.config.json file when using jsreport in DEVELOPMENT mode');
    fs.writeFileSync(path.join(basePathConfig, 'dev.config.json'), JSON.stringify(newConfig, undefined, 2));
  }

  return Promise.resolve();
}

function saveNewFile(savePath, content) {
  const baseDir = path.dirname(savePath);

  return (
    mkdirPromise(baseDir)
    .then(() => writeFile(savePath, content))
  );
}

function readNeDBFilesInDirectory(pathToDir) {
  return (
    readDir(pathToDir)
    .then(pmap(file => {
      const pathToFile = path.join(pathToDir, file);

      return (
        getFileStat(pathToFile)
        .then(fileInfo => {
          if (!fileInfo.isFile()) {
            return;
          }

          return readFile(pathToFile);
        })
        .then(fileContent => {
          let parsedFileContent;

          if (fileContent == null) {
            return {
              name: file,
              content: null,
              basePath: pathToDir,
              absolutePath: pathToFile,
              isValid: false
            };
          }

          try {
            parsedFileContent = JSON.parse(fileContent.toString());
          } catch (parseErr) {
            parsedFileContent = undefined;
          }

          return {
            name: file,
            content: parsedFileContent,
            basePath: pathToDir,
            absolutePath: pathToFile,
            isValid: true
          };
        })
      );
    }))
    .then(pfilter(dataFile => dataFile.isValid && dataFile.content != null))
  );
}

migration.migrationName = path.basename(__filename, '.js');
migration.description = 'Migrate from json based [embedded-store] to files based [fs-store]';

export default migration;