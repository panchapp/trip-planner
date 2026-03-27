import * as dotenv from 'dotenv';
import type { Knex } from 'knex';

// Load environment variables
dotenv.config({ path: '.env' });

const config: Knex.Config = {
  client: 'pg',
  connection: process.env['DATABASE_URL'] ?? '',
  pool: { min: 0, max: 10 },
  migrations: {
    directory: './migrations',
  },
};

export default config;
