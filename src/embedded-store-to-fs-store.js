
import path from 'path';

const migration = () => {
  console.log('running migration..');
};

migration.migrationName = path.basename(__filename, '.js');
migration.description = 'Migrate your json templates [embedded-store] to static files [fs-store]';

export default migration;
