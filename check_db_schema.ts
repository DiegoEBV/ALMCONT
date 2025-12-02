
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

async function checkSchema() {
    console.log('Checking "usuarios" table schema...')

    // Try to fetch one user to see columns
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching users:', error)
        return
    }

    if (data && data.length > 0) {
        console.log('User record keys:', Object.keys(data[0]))
        console.log('Sample user:', data[0])
    } else {
        console.log('No users found in "usuarios" table.')

        // Try to insert a dummy to see if it fails on 'role' or 'rol'
        // Actually, better not to pollute DB if not needed.
        // We can try to select specific columns and see if it errors.

        const { error: roleError } = await supabase.from('usuarios').select('role').limit(1)
        if (!roleError) console.log('Column "role" EXISTS.')
        else console.log('Column "role" error:', roleError.message)

        const { error: rolError } = await supabase.from('usuarios').select('rol').limit(1)
        if (!rolError) console.log('Column "rol" EXISTS.')
        else console.log('Column "rol" error:', rolError.message)
    }
}

checkSchema()
