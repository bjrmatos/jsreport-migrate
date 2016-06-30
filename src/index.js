
// registering Promise implementation in global object for any library using `any-promise` (like promise-map and promise-filter)
// (to bring support in olders versions of node)
global.Promise = require('pinkie-promise');

/* eslint-disable no-console */
import requireDir from 'require-dir';
import chalk from 'chalk';
import inquirer from 'inquirer';

const migrations = requireDir('./migrations');

const migrationChoices = Object.keys(migrations).map((migrationName) => {
  const currentMigration = migrations[migrationName];

  return {
    name: `${currentMigration.migrationName} -> ${currentMigration.description}`,
    value: currentMigration
  };
});

export default function(workingDir) {
  const currentBasePath = workingDir || process.cwd();

  inquirer.prompt([{
    type: 'list',
    name: 'migration',
    message: 'Select a migration script to run',
    choices: migrationChoices
  }], (selected) => {
    console.log(
      chalk.yellow(
        `runnning ${chalk.magenta.bold(selected.migration.migrationName)} migration script`
      )
    );

    selected.migration(currentBasePath).then(() => {
      console.log(
        chalk.yellow(
          `migration ${chalk.magenta.bold(selected.migration.migrationName)} finished`
        )
      );
    }).catch((err) => {
      console.error(err);

      console.log(
        chalk.yellow(
          `migration ${chalk.magenta.bold(selected.migration.migrationName)} finished`
        )
      );
    });
  });
}
