import * as dotenv from 'dotenv';
import type { Knex } from 'knex';
import path from 'path';

dotenv.config({ path: '.env' });

const config: Knex.Config = {
  client: 'pg',
  connection: process.env['DATABASE_URL'] ?? '',
  pool: { min: 0, max: 10 },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
  },
};

export default config;
