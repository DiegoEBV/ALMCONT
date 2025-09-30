// Test directo del sistema localDB
console.log('=== TEST DIRECTO DE LOCALDB ===\n');

// Simular el comportamiento del navegador
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  }
};

async function testLocalDB() {
  try {
    console.log('1. Importando database.json...');
    const database = require('./src/data/database.json');
    console.log('✅ Database.json cargado');
    console.log('   Usuarios:', database.usuarios.length);
    
    console.log('\n2. Simulando inicialización de LocalDB...');
    
    // Simular el proceso de carga
    const storageKey = 'almacen_local_db';
    const stored = localStorage.getItem(storageKey);
    
    let data;
    if (stored) {
      console.log('📦 Datos encontrados en localStorage');
      data = JSON.parse(stored);
    } else {
      console.log('📁 Cargando desde database.json...');
      data = { ...database };
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log('✅ Datos guardados en localStorage');
    }
    
    console.log('\n3. Verificando usuarios cargados...');
    console.log('   Total usuarios:', data.usuarios.length);
    
    const coordinador = data.usuarios.find(u => u.email === 'coordinador@obra.com');
    if (coordinador) {
      console.log('✅ Coordinador encontrado:');
      console.log('   Email:', coordinador.email);
      console.log('   Password:', coordinador.password);
      console.log('   Rol:', coordinador.rol);
      console.log('   Activo:', coordinador.activo);
    } else {
      console.log('❌ Coordinador NO encontrado');
    }
    
    console.log('\n4. Simulando autenticación...');
    const email = 'coordinador@obra.com';
    const password = 'password123';
    
    const usuario = data.usuarios.find(u => 
      u.email === email && 
      u.password === password && 
      u.activo
    );
    
    if (usuario) {
      console.log('✅ AUTENTICACIÓN EXITOSA');
      console.log('   Usuario autenticado:', usuario.nombre, usuario.apellido);
      console.log('   Rol:', usuario.rol);
    } else {
      console.log('❌ AUTENTICACIÓN FALLIDA');
      console.log('   Verificando cada condición:');
      
      const userByEmail = data.usuarios.find(u => u.email === email);
      console.log('   - Email encontrado:', !!userByEmail);
      
      if (userByEmail) {
        console.log('   - Password coincide:', userByEmail.password === password);
        console.log('   - Usuario activo:', userByEmail.activo);
        console.log('   - Password en BD:', userByEmail.password);
        console.log('   - Password enviado:', password);
      }
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

testLocalDB();