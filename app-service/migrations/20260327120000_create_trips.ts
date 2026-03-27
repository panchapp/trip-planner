import type { Knex } from 'knex';

const MIGRATION_NAME = '20260327120000_create_trips.ts';

export async function up(knex: Knex): Promise<void> {
  try {
    await knex.schema.createTable('trips', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('title', 255).notNullable();
      table.string('destination', 512).notNullable();
      table.timestamp('start_date', { useTz: true }).nullable();
      table.timestamp('end_date', { useTz: true }).nullable();
      table.string('status', 32).notNullable().defaultTo('draft');
      table.text('cover_image_url').nullable();
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.index(['user_id'], 'idx_trips_user_id');
      table.index(['user_id', 'status'], 'idx_trips_user_id_status');
    });

    await knex.raw(`
      ALTER TABLE trips
      ADD CONSTRAINT trips_status_check
      CHECK (status IN ('draft', 'confirmed', 'cancelled'))
    `);
  } catch (error) {
    console.error(`${MIGRATION_NAME} failed to run migration "up":`, error);
    throw error;
  }
}

export async function down(knex: Knex): Promise<void> {
  try {
    await knex.schema.dropTableIfExists('trips');
  } catch (error) {
    console.error(`${MIGRATION_NAME} failed to run migration "down":`, error);
    throw error;
  }
}
