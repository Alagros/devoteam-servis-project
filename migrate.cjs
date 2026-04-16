const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://devoteam:devoteam_db_password@db-postgres:5432/devoteam_db';
const DATA_DIR = path.join(__dirname, 'data');

const client = new Client({ connectionString: DATABASE_URL });

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL database.');

        // CREATE TABLE for JSONB document store
        await client.query(`
            CREATE TABLE IF NOT EXISTS docs (
                resource VARCHAR(50),
                id VARCHAR(255),
                data JSONB,
                PRIMARY KEY (resource, id)
            );
        `);
        console.log('PostgreSQL jsonb table created.');

        function migrateCollection(resource) {
            const p = path.join(DATA_DIR, `${resource}.json`);
            if (!fs.existsSync(p)) return [];
            return JSON.parse(fs.readFileSync(p, 'utf-8'));
        }

        const resources = ['users', 'settings', 'tickets', 'logs', 'photos'];

        for (const res of resources) {
            const items = migrateCollection(res);
            let count = 0;
            for (const item of items) {
                // Determine ID (some resources might not have explicit ID, fallback to random if needed, but tickets/users all have id)
                const itemId = String(item.id || Math.random().toString());
                
                await client.query(
                    `INSERT INTO docs (resource, id, data) VALUES ($1, $2, $3) 
                     ON CONFLICT (resource, id) DO UPDATE SET data = $3`,
                    [res, itemId, JSON.stringify(item)]
                );
                count++;
            }
            console.log(`Migrated ${count} records for '${res}'.`);
        }

        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

migrate();
