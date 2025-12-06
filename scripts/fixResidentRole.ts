import { supabaseUsersService } from '../src/services/supabaseUsersService'

async function fixResidentRole() {
    const email = 'residente@obra.com'
    console.log(`🔍 Checking user with email: ${email}`)

    try {
        const user = await supabaseUsersService.getByEmail(email)

        if (!user) {
            console.error('❌ User not found!')
            return
        }

        console.log(`✅ User found: ${user.id}`)
        console.log(`Current Role: ${user.rol}`)

        if (user.rol === 'RESIDENTE') {
            console.log('✅ User already has RESIDENTE role.')
            return
        }

        console.log('🔄 Updating role to RESIDENTE...')
        const updated = await supabaseUsersService.update(user.id, { rol: 'RESIDENTE' })

        if (updated) {
            console.log('✅ Role updated successfully!')
            console.log('New Role:', updated.rol)
        } else {
            console.error('❌ Failed to update role.')
        }

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

fixResidentRole()
