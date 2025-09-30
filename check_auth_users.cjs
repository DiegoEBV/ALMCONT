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

async function checkAuthUsers() {
  console.log('🔍 Verificando usuarios en Supabase Auth...');
  
  try {
    // Get all users from auth.users table
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error al obtener usuarios:', error);
      return;
    }
    
    console.log(`\n📊 Total de usuarios encontrados: ${users.users.length}`);
    
    // Check for specific users
    const targetUsers = ['coordinador@obra.com', 'logistica@obra.com'];
    
    users.users.forEach(user => {
      console.log(`\n👤 Usuario: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Creado: ${user.created_at}`);
      console.log(`   Confirmado: ${user.email_confirmed_at ? 'Sí' : 'No'}`);
      console.log(`   Último login: ${user.last_sign_in_at || 'Nunca'}`);
      
      if (targetUsers.includes(user.email)) {
        console.log(`   ⚠️  USUARIO OBJETIVO ENCONTRADO`);
      }
    });
    
    // Check if target users exist
    targetUsers.forEach(email => {
      const userExists = users.users.find(u => u.email === email);
      if (!userExists) {
        console.log(`\n❌ Usuario ${email} NO EXISTE en Auth`);
      }
    });
    
    // Try to test login with known credentials
    console.log('\n🔐 Probando autenticación con credenciales conocidas...');
    
    const testCredentials = [
      { email: 'coordinador@obra.com', password: 'password123' },
      { email: 'logistica@obra.com', password: 'password123' }
    ];
    
    for (const cred of testCredentials) {
      console.log(`\n🧪 Probando login: ${cred.email}`);
      
      // Create a new client for testing login
      const testClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q');
      
      const { data, error } = await testClient.auth.signInWithPassword({
        email: cred.email,
        password: cred.password
      });
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Login exitoso para ${cred.email}`);
        console.log(`   Usuario ID: ${data.user?.id}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkAuthUsers();