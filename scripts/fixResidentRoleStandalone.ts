import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function fixResidentRole() {
    console.log('🚀 Starting fixResidentRole script...')

    // 1. Read .env file
    const envPath = path.resolve(__dirname, '../.env')
    console.log(`📂 Reading .env from: ${envPath}`)

    let envContent = ''
    try {
        envContent = fs.readFileSync(envPath, 'utf-8')
    } catch (e) {
        console.error('❌ Could not read .env file. Make sure it exists.')
        return
    }

    // 2. Parse env vars
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/)
    const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)

    const supabaseUrl = urlMatch ? urlMatch[1].trim() : process.env.VITE_SUPABASE_URL
    const supabaseKey = keyMatch ? keyMatch[1].trim() : process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Could not find VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
        return
    }

    console.log('✅ Found Supabase credentials.')

    // 3. Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)

    const email = 'residente@obra.com'
    console.log(`🔍 Checking user with email: ${email}`)

    // 4. Get User
    console.log('🔍 Listing all users first...')
    const { data: allUsers } = await supabase.from('usuarios').select('email, rol')
    console.log('Current users in DB:', allUsers)

    const { data: user, error: fetchError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single()

    if (fetchError || !user) {
        console.log('⚠️ User not found in public.usuarios table.')
        console.log('🛠️ Creating user manually...')

        const { data: newUser, error: createError } = await supabase
            .from('usuarios')
            .insert({
                id: crypto.randomUUID(),
                email: email,
                nombre: 'Residente',
                apellido: 'Obra',
                rol: 'RESIDENTE',
                activo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (createError) {
            console.error('❌ Failed to create user:', createError)
        } else {
            console.log('✅ User created successfully with RESIDENTE role:', newUser)
        }
        return
    }

    console.log(`✅ User found: ${user.id}`)
    console.log(`Current Role: ${user.rol}`)

    if (user.rol === 'RESIDENTE') {
        console.log('✅ User already has RESIDENTE role.')
        return
    }

    // 5. Update Role
    console.log('🔄 Updating role to RESIDENTE...')
    const { data: updated, error: updateError } = await supabase
        .from('usuarios')
        .update({ rol: 'RESIDENTE' })
        .eq('id', user.id)
        .select()
        .single()

    if (updateError) {
        console.error('❌ Failed to update role:', updateError)
    } else {
        console.log('✅ Role updated successfully!')
        console.log('New Role:', updated.rol)
    }
}

fixResidentRole()
