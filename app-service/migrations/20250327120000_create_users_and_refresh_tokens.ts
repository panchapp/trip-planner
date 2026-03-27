import type { Knex } from 'knex';

const MIGRATION_NAME = '20250327120000_create_users_and_refresh_tokens.ts';

export async function up(knex: Knex): Promise<void> {
  try {
    await knex.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('email').notNullable().unique();
      table.string('google_id').notNullable().unique();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('avatar_url', 2048).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('refresh_tokens', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token_hash', 64).notNullable().unique();
      table.timestamp('expires_at', { useTz: true }).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.index(['user_id'], 'idx_refresh_tokens_user_id');
    });
  } catch (error) {
    console.error(`${MIGRATION_NAME} failed to run migration "up":`, error);
    throw error;
  }
}

export async function down(knex: Knex): Promise<void> {
  try {
    await knex.schema.dropTableIfExists('refresh_tokens');
    await knex.schema.dropTableIfExists('users');
  } catch (error) {
    console.error(`${MIGRATION_NAME} failed to run migration "down":`, error);
    throw error;
  }
}
