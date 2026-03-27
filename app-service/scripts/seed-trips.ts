import knex from 'knex';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to app-service/.env');
  process.exit(1);
}

const db = knex({
  client: 'pg',
  connection: DATABASE_URL,
  pool: { min: 0, max: 10 },
});

/** Default account for local seed trips. Override with SEED_USER_ID. */
const DEFAULT_SEED_USER_ID = '48611bd7-a04b-4206-94f6-3a8da16ff406';

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function resolveUserId(): Promise<string> {
  const id = process.env['SEED_USER_ID'] ?? DEFAULT_SEED_USER_ID;
  const row = await db('users').where({ id }).first<{ id: string }>();
  if (!row) {
    throw new Error(
      `User ${id} not found in users. Sign in once to create the account, or set SEED_USER_ID.`,
    );
  }
  return row.id;
}

async function seedTrips(userId: string): Promise<number> {
  await db('trips').where({ user_id: userId }).where('title', 'like', '[Seed]%').del();

  const now = new Date();

  const trips: Array<{
    user_id: string;
    title: string;
    destination: string;
    start_date: Date | null;
    end_date: Date | null;
    status: 'draft' | 'confirmed' | 'cancelled';
    cover_image_url: null;
  }> = [
    {
      user_id: userId,
      title: '[Seed] Summer in Tokyo',
      destination: 'Tokyo, Japan',
      start_date: addDays(now, 30),
      end_date: addDays(now, 44),
      status: 'confirmed',
      cover_image_url: null,
    },
    {
      user_id: userId,
      title: '[Seed] Weekend in Paris',
      destination: 'Paris, France',
      start_date: addDays(now, 7),
      end_date: addDays(now, 10),
      status: 'confirmed',
      cover_image_url: null,
    },
    {
      user_id: userId,
      title: '[Seed] Draft: Road trip',
      destination: 'Pacific Coast Highway',
      start_date: null,
      end_date: null,
      status: 'draft',
      cover_image_url: null,
    },
    {
      user_id: userId,
      title: '[Seed] Past: Berlin',
      destination: 'Berlin, Germany',
      start_date: addDays(now, -120),
      end_date: addDays(now, -100),
      status: 'confirmed',
      cover_image_url: null,
    },
    {
      user_id: userId,
      title: '[Seed] Past: Rome',
      destination: 'Rome, Italy',
      start_date: addDays(now, -380),
      end_date: addDays(now, -365),
      status: 'confirmed',
      cover_image_url: null,
    },
    {
      user_id: userId,
      title: '[Seed] Past: Amsterdam',
      destination: 'Amsterdam, Netherlands',
      start_date: addDays(now, -50),
      end_date: addDays(now, -45),
      status: 'confirmed',
      cover_image_url: null,
    },
    {
      user_id: userId,
      title: '[Seed] Past: New York',
      destination: 'New York, USA',
      start_date: addDays(now, -210),
      end_date: addDays(now, -200),
      status: 'confirmed',
      cover_image_url: null,
    },
    {
      user_id: userId,
      title: '[Seed] Past: Lisbon',
      destination: 'Lisbon, Portugal',
      start_date: addDays(now, -14),
      end_date: addDays(now, -7),
      status: 'confirmed',
      cover_image_url: null,
    },
    {
      user_id: userId,
      title: '[Seed] Cancelled ski trip',
      destination: 'Zermatt, Switzerland',
      start_date: addDays(now, 60),
      end_date: addDays(now, 67),
      status: 'cancelled',
      cover_image_url: null,
    },
  ];

  await db('trips').insert(trips);
  return trips.length;
}

async function main(): Promise<void> {
  const userId = await resolveUserId();
  const count = await seedTrips(userId);
  console.log(`Seeded ${count} trips for user ${userId}`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.destroy());
