const fs = require('fs');
const path = require('path');

// Función para leer la base de datos local
function readLocalDB() {
  try {
    const dbPath = path.join(__dirname, 'src', 'data', 'localDB.json');
    console.log('🔍 Buscando base de datos local en:', dbPath);
    
    if (!fs.existsSync(dbPath)) {
      console.log('❌ Archivo localDB.json no encontrado');
      return null;
    }
    
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error leyendo base de datos local:', error);
    return null;
  }
}

// Función principal
function checkLocalUsers() {
  console.log('🔍 Verificando usuarios en base de datos local...');
  
  const db = readLocalDB();
  if (!db) {
    console.log('❌ No se pudo leer la base de datos local');
    return;
  }
  
  console.log('📊 Estructura de la base de datos:');
  console.log('Tablas disponibles:', Object.keys(db));
  
  if (!db.usuarios) {
    console.log('❌ Tabla "usuarios" no encontrada en la base de datos');
    return;
  }
  
  const usuarios = db.usuarios;
  console.log(`\n👥 Total de usuarios en base local: ${usuarios.length}`);
  
  // Verificar usuarios específicos
  const targetEmails = ['coordinador@obra.com', 'logistica@obra.com'];
  
  usuarios.forEach(usuario => {
    console.log(`\n👤 Usuario: ${usuario.email}`);
    console.log(`   ID: ${usuario.id}`);
    console.log(`   Nombre: ${usuario.nombre} ${usuario.apellido}`);
    console.log(`   Rol: ${usuario.rol}`);
    console.log(`   Activo: ${usuario.activo}`);
    console.log(`   Obra ID: ${usuario.obra_id || 'No asignada'}`);
    console.log(`   Password: ${usuario.password ? '***' : 'NO DEFINIDA'}`);
    
    if (targetEmails.includes(usuario.email)) {
      console.log(`   ⚠️  USUARIO OBJETIVO ENCONTRADO`);
      console.log(`   Password real: ${usuario.password}`);
    }
  });
  
  // Verificar si faltan usuarios objetivo
  targetEmails.forEach(email => {
    const userExists = usuarios.find(u => u.email === email);
    if (!userExists) {
      console.log(`\n❌ Usuario ${email} NO EXISTE en base de datos local`);
    }
  });
  
  // Verificar contraseñas
  console.log('\n🔐 Verificando contraseñas de usuarios objetivo:');
  targetEmails.forEach(email => {
    const user = usuarios.find(u => u.email === email);
    if (user) {
      console.log(`${email}: password = "${user.password}"`);
      if (user.password === 'password123') {
        console.log(`   ✅ Contraseña coincide con la esperada`);
      } else {
        console.log(`   ❌ Contraseña NO coincide (esperada: "password123", actual: "${user.password}")`);
      }
    }
  });
}

checkLocalUsers();