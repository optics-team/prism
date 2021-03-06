import {Server} from 'hapi';
import {inspect} from 'collimator';
import * as pgPromise from 'pg-promise';
import * as pgMonitor from 'pg-monitor';

import prism from 'prism';
import PostgreSQL from 'prism/source/PostgreSQL';
import ReadItem from 'prism/action/ReadItem';
import ReadCollection from 'prism/action/ReadCollection';
import CreateItem from 'prism/action/CreateItem';
import UpdateItem from 'prism/action/UpdateItem';
import DeleteItem from 'prism/action/DeleteItem';

import security from 'prism/security';
import Resource from 'prism/security/backend/Resource';

var server = new Server();
server.connection({port: 8080});

var pgpOptions = {};
(pgMonitor as any).attach(pgpOptions);

var db = pgPromise(pgpOptions)({
  host: '/var/run/postgresql',
  database: 'prism-example'
});

var source = new PostgreSQL(db);

server.register([{
  register: prism,
}, {
  register: security,
  options: {
    key: 'example'
  }
}])
  .then(() => console.log('Registered Prism plugins'))
  .then(() => inspect(db))
  .then(tableConfigs => {
    tableConfigs.forEach((config: any) => {
      console.log(`Registering actions for table '${config.name}'`);

      server.plugins['prism'].registerAction([
          new ReadItem({source, ...config}),
          new ReadCollection({source, ...config}),
          new CreateItem({source, ...config}),
          new UpdateItem({source, ...config}),
          new DeleteItem({source, ...config})
      ]);

      if (config.name === 'users') {
          let backend = new Resource({source, ...config});
          server.plugins['prism-security'].registerBackend(backend);
      }
    });

    return server.start();
  })
  .catch(console.error);
