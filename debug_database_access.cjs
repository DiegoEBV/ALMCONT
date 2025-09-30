const fs = require('fs');
const path = require('path');

console.log('=== DEBUG: ACCESO A BASE DE DATOS ===\n');

// 1. Verificar database.json
console.log('1. Verificando database.json...');
try {
  const dbPath = path.join(__dirname, 'src', 'data', 'database.json');
  console.log('Ruta:', dbPath);
  console.log('Existe:', fs.existsSync(dbPath));
  
  if (fs.existsSync(dbPath)) {
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log('Usuarios en database.json:', dbData.usuarios?.length || 0);
    
    const coordinador = dbData.usuarios?.find(u => u.email === 'coordinador@obra.com');
    if (coordinador) {
      console.log('✅ Coordinador encontrado en database.json');
      console.log('   Email:', coordinador.email);
      console.log('   Password:', coordinador.password);
      console.log('   Rol:', coordinador.rol);
    } else {
      console.log('❌ Coordinador NO encontrado en database.json');
    }
  }
} catch (error) {
  console.error('Error con database.json:', error.message);
}

console.log('\n2. Verificando localStorage (simulado)...');
// Simular lo que hace localDB.ts
const storageKey = 'almacen_local_db';
console.log('Storage key que usa la app:', storageKey);

console.log('\n3. Verificando localDB.ts...');
try {
  const localDBPath = path.join(__dirname, 'src', 'lib', 'localDB.ts');
  console.log('LocalDB existe:', fs.existsSync(localDBPath));
  
  // Leer las primeras líneas para ver la importación
  if (fs.existsSync(localDBPath)) {
    const content = fs.readFileSync(localDBPath, 'utf8');
    const lines = content.split('\n').slice(0, 10);
    console.log('Primeras líneas de localDB.ts:');
    lines.forEach((line, i) => {
      if (line.includes('database') || line.includes('import')) {
        console.log(`   ${i+1}: ${line}`);
      }
    });
  }
} catch (error) {
  console.error('Error con localDB.ts:', error.message);
}

console.log('\n4. Verificando si hay otros archivos de base de datos...');
const possibleDBFiles = [
  'database.db',
  'almacen.db',
  'src/data/localDB.json'
];

possibleDBFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  console.log(`${file}: ${fs.existsSync(fullPath) ? '✅ Existe' : '❌ No existe'}`);
});