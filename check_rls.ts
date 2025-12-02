
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env')
const envConfig = dotenv.parse(fs.readFileSync(envPath))

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY)

async function checkRead() {
    console.log('Attempting to read user by email (coordinador@obra.com)...')

    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', 'coordinador@obra.com')
        .single()

    if (error) {
        console.error('❌ Read Failed:', error)
        if (error.code === '42P17') {
            console.error('🚨 INFINITE RECURSION DETECTED. RLS IS BROKEN.')
        }
    } else {
        console.log('✅ Read Success:', data)
    }
}

checkRead()
