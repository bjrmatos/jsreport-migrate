
/* eslint no-console:0 */
import requireDir from 'require-dir';
import chalk from 'chalk';
import inquirer from 'inquirer';

const migrations = requireDir('./');

const migrationChoices = Object.keys(migrations).map((migrationName) => {
  const currentMigration = migrations[migrationName];

  return {
    name: `${currentMigration.migrationName} -> ${currentMigration.description}`,
    value: currentMigration
  };
});

export default function() {
  inquirer.prompt([{
    type: 'list',
    name: 'migration',
    message: 'Select a migration script to run',
    choices: migrationChoices
  }], (selected) => {
    console.log(
      chalk.yellow(
        `runnning ${chalk.magenta.bold(selected.migration.migrationName)} migration script..`
      )
    );

    selected.migration();
  });
}
