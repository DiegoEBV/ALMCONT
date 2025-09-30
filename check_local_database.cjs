const fs = require('fs');
const path = require('path');

console.log('=== VERIFICANDO DATOS LOCALES ===');

try {
  const dbPath = path.join(__dirname, 'src', 'data', 'database.json');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  console.log('Usuarios encontrados:', dbData.usuarios.length);
  console.log('\nDetalle de usuarios:');
  
  dbData.usuarios.forEach(u => {
    console.log(`- Email: ${u.email}`);
    console.log(`  Password: ${u.password ? 'SÍ (' + u.password + ')' : 'NO'}`);
    console.log(`  Rol: ${u.rol}`);
    console.log(`  Activo: ${u.activo}`);
    console.log('---');
  });
  
  // Verificar específicamente coordinador@obra.com
  const coordinador = dbData.usuarios.find(u => u.email === 'coordinador@obra.com');
  if (coordinador) {
    console.log('\n✅ COORDINADOR ENCONTRADO:');
    console.log('Email:', coordinador.email);
    console.log('Password:', coordinador.password);
    console.log('Rol:', coordinador.rol);
    console.log('Activo:', coordinador.activo);
  } else {
    console.log('\n❌ COORDINADOR NO ENCONTRADO');
  }
  
} catch (error) {
  console.error('Error leyendo database.json:', error.message);
}