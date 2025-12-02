
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

async function listTables() {
    console.log('Listing tables...')

    // Query information_schema to list tables
    // Note: RLS might block this, but usually anon key can read public schema info if not restricted.
    // Alternatively, we can try to select from common table names.

    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .limit(1)

    if (error) {
        console.log('Error querying "usuarios":', error.message)
    } else {
        console.log('Success querying "usuarios". Data:', data)
    }

    // Try 'users'
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1)

    if (usersError) {
        console.log('Error querying "users":', usersError.message)
    } else {
        console.log('Success querying "users". Data:', usersData)
    }
}

listTables()
