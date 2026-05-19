import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL, // Must use the direct URL for DDL statements
    },
  },
});
async function main() {
  console.log('Initializing pgvector database tables...');

  try {
    console.log('1. Enabling vector extension...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('✅ Vector extension enabled (or already exists).');

    console.log('2. Re-creating content_embeddings table with 3072 dimensions...');
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS content_embeddings CASCADE;`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE content_embeddings (
        id BIGSERIAL PRIMARY KEY,
        content_id TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        source_field TEXT NOT NULL,
        embedding vector(3072),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(content_id, source_field, chunk_index)
      );
    `);
    const dims = await prisma.$queryRawUnsafe<Array<{ dimensions: number }>>(
      `SELECT atttypmod - 4 AS dimensions
       FROM pg_attribute
       WHERE attrelid = 'content_embeddings'::regclass
         AND attname = 'embedding'`
    );
    console.log(`✅ Table created successfully with embedding dim: ${dims?.[0]?.dimensions ?? 'unknown'}.`);

    console.log('\n🎉 Vector database setup complete! You can now run the backfill script.');
  } catch (error: any) {
    console.error('\n❌ Error setting up vector database:');
    console.error(error.message);
    if (error.message.includes('could not open extension control file')) {
      console.log('\n💡 IT LOOKS LIKE PGVECTOR IS NOT INSTALLED ON YOUR POSTGRES SERVER.');
      console.log('If you are running PostgreSQL locally on Windows, you must install the pgvector extension separately, or run Postgres via Docker:');
      console.log('docker run --name pgvector -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d pgvector/pgvector:pg16');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
