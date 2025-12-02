
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load env vars
const envPath = path.resolve(process.cwd(), '.env')
const envConfig = dotenv.parse(fs.readFileSync(envPath))

const supabaseUrl = envConfig.VITE_SUPABASE_URL
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function listAllTables() {
    console.log('Listing all tables in public schema...')

    // We can't query information_schema directly with supabase-js usually unless we use rpc or if we have permissions.
    // But we can try to use a raw query if we had a service role key, which we don't (we have anon).
    // However, sometimes we can guess.

    // Let's try to query a known table "users" or "profiles" just in case.
    const tablesToCheck = ['usuarios', 'Usuarios', 'users', 'Users', 'profiles', 'Profiles', 'role', 'roles']

    for (const table of tablesToCheck) {
        const { error } = await supabase.from(table).select('count(*)', { count: 'exact', head: true })
        if (!error) {
            console.log(`✅ Table "${table}" EXISTS and is accessible.`)
        } else {
            console.log(`❌ Table "${table}" error: ${error.message}`)
        }
    }
}

listAllTables()
