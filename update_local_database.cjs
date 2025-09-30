const fs = require('fs');
const path = require('path');

const databasePath = path.join(__dirname, 'src', 'data', 'database.json');

async function updateLocalDatabase() {
  console.log('🔄 Actualizando contraseñas en database.json local...\n');

  try {
    // 1. Leer archivo actual
    console.log('1. Leyendo database.json...');
    const rawData = fs.readFileSync(databasePath, 'utf8');
    const database = JSON.parse(rawData);

    console.log(`✅ Archivo leído correctamente`);
    console.log(`📊 Usuarios encontrados: ${database.usuarios.length}`);

    // 2. Mostrar contraseñas actuales
    console.log('\n2. Contraseñas actuales:');
    database.usuarios.forEach(user => {
      console.log(`   - ${user.email}: password="${user.password}"`);
    });

    // 3. Actualizar contraseñas
    console.log('\n3. Actualizando contraseñas a "password123"...');
    let updatedCount = 0;
    
    database.usuarios.forEach(user => {
      if (user.password !== 'password123') {
        user.password = 'password123';
        updatedCount++;
      }
    });

    console.log(`✅ ${updatedCount} usuarios actualizados`);

    // 4. Guardar archivo
    console.log('\n4. Guardando cambios...');
    fs.writeFileSync(databasePath, JSON.stringify(database, null, 2), 'utf8');
    console.log('✅ Archivo guardado correctamente');

    // 5. Verificar cambios
    console.log('\n5. Verificando cambios...');
    const verifyData = fs.readFileSync(databasePath, 'utf8');
    const verifyDatabase = JSON.parse(verifyData);

    console.log('✅ Estado final de usuarios:');
    verifyDatabase.usuarios.forEach(user => {
      const status = user.password === 'password123' ? '✅' : '❌';
      console.log(`   ${status} ${user.email}: password="${user.password}"`);
    });

    // 6. Verificar coordinador específicamente
    const coordinador = verifyDatabase.usuarios.find(u => u.email === 'coordinador@obra.com');
    if (coordinador) {
      console.log('\n🎯 COORDINADOR VERIFICADO:');
      console.log(`   Email: ${coordinador.email}`);
      console.log(`   Password: ${coordinador.password}`);
      console.log(`   Status: ${coordinador.password === 'password123' ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
    } else {
      console.log('\n❌ Coordinador no encontrado en database.json');
    }

    console.log('\n🎉 ¡Actualización de database.json completada!');
    console.log('👉 Base de datos local sincronizada con Supabase');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateLocalDatabase();