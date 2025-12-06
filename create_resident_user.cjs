const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gqhyrntdedrazmcjndhs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzMzgxNywiZXhwIjoyMDcwNjA5ODE3fQ._Npw25pJ5p8ZTgoZpH_p993x7Tm9smWz6BSwWVyPFk0';

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createResidentUser() {
    console.log('🏗️ Creating/Fixing Resident User...');

    const residentEmail = 'residente@obra.com';
    const residentPassword = 'password123'; // Default password, adjust if needed

    try {
        // 1. Check if user exists in Auth
        console.log(`🔍 Checking if ${residentEmail} exists in Auth...`);
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('❌ Error listing users:', listError);
            return;
        }

        let user = users.users.find(u => u.email === residentEmail);

        if (!user) {
            console.log(`⚠️ User not found in Auth. Creating...`);
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: residentEmail,
                password: residentPassword,
                email_confirm: true
            });

            if (createError) {
                console.error('❌ Error creating user in Auth:', createError);
                return;
            }

            user = newUser.user;
            console.log(`✅ User created in Auth with ID: ${user.id}`);
        } else {
            console.log(`✅ User found in Auth with ID: ${user.id}`);
        }

        // 2. Fetch a valid obra_id just in case
        console.log(`🔍 Fetching a valid obra_id...`);
        const { data: obras, error: obrasError } = await supabase
            .from('obras')
            .select('id')
            .limit(1);

        let validObraId = null;
        if (obras && obras.length > 0) {
            validObraId = obras[0].id;
            console.log(`✅ Using obra_id: ${validObraId}`);
        } else {
            console.warn(`⚠️ No obras found. Trying insertion with null (if allowed)...`);
        }

        // 3. Check if user exists in public.usuarios
        console.log(`🔍 Checking public.usuarios for ID: ${user.id}`);
        const { data: existingProfile, error: profileError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('❌ Error checking profile:', profileError);
            return;
        }

        if (!existingProfile) {
            console.log(`⚠️ Profile not found. Creating entry in public.usuarios...`);

            const insertData = {
                id: user.id,
                email: residentEmail,
                nombre: 'residente',
                apellido: 'user',
                activo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (validObraId) {
                insertData.obra_id = validObraId;
            }

            let roleToUse = 'RESIDENTE';

            try {
                const { error: insertError } = await supabase
                    .from('usuarios')
                    .insert({ ...insertData, rol: roleToUse });

                if (insertError) throw insertError;

                console.log(`✅ Residente profile created successfully with role ${roleToUse}!`);

            } catch (err) {
                if (err.code === '23514') { // Check violation
                    console.warn(`⚠️ DB rejected role '${roleToUse}'. Falling back to 'PRODUCCION'...`);
                    roleToUse = 'PRODUCCION';

                    const { error: retryError } = await supabase
                        .from('usuarios')
                        .insert({ ...insertData, rol: roleToUse });

                    if (retryError) {
                        console.error('❌ Error inserting with fallback role:', retryError);
                    } else {
                        console.log(`✅ Residente profile created successfully with fallback role ${roleToUse}. Frontend will handle permission overrides.`);
                    }
                } else {
                    console.error('❌ Error inserting profile:', err);
                }
            }

        } else {
            console.log(`ℹ️ Profile exists. Checking Role...`);
            if (existingProfile.rol !== 'RESIDENTE') {
                console.log(`⚠️ Role is '${existingProfile.rol}'. Attempting update to 'RESIDENTE'...`);

                const { error: updateError } = await supabase
                    .from('usuarios')
                    .update({ rol: 'RESIDENTE' })
                    .eq('id', user.id);

                if (updateError) {
                    if (updateError.code === '23514') {
                        console.warn(`⚠️ DB rejected update to role 'RESIDENTE'. Leaving as '${existingProfile.rol}'. Frontend will handle permission overrides.`);
                    } else {
                        console.error('❌ Error updating role:', updateError);
                    }
                } else {
                    console.log(`✅ Role updated to RESIDENTE.`);
                }
            } else {
                console.log(`✅ User already has RESIDENTE role.`);
            }
        }

    } catch (error) {
        console.error('❌ General error:', error);
    }
}

createResidentUser();
