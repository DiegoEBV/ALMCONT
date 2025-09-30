import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de la base de datos local
const dbPath = path.join(__dirname, 'almacen.db');

try {
  const db = new Database(dbPath);
  
  console.log('🔍 Verificando estructura de la base de datos local...');
  console.log(`📁 Ruta de la BD: ${dbPath}`);
  
  // Obtener todas las tablas
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  console.log(`\n📊 Tablas encontradas (${tables.length}):`);
  tables.forEach(table => {
    console.log(`   - ${table.name}`);
  });
  
  // Verificar si existe alguna tabla relacionada con obras
  const obrasTables = tables.filter(t => 
    t.name.toLowerCase().includes('obra') || 
    t.name.toLowerCase().includes('project') ||
    t.name.toLowerCase().includes('trabajo')
  );
  
  if (obrasTables.length > 0) {
    console.log(`\n🏗️ Tablas relacionadas con obras:`);
    obrasTables.forEach(table => {
      console.log(`\n📋 Estructura de ${table.name}:`);
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      columns.forEach(col => {
        console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // Mostrar algunos datos de ejemplo
      try {
        const sampleData = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
        if (sampleData.length > 0) {
          console.log(`   📄 Datos de ejemplo:`);
          sampleData.forEach((row, index) => {
            console.log(`     ${index + 1}. ${JSON.stringify(row)}`);
          });
        } else {
          console.log(`   📄 No hay datos en esta tabla`);
        }
      } catch (error) {
        console.log(`   ❌ Error al leer datos: ${error.message}`);
      }
    });
  }
  
  // Verificar tablas de usuarios
  const userTables = tables.filter(t => 
    t.name.toLowerCase().includes('user') || 
    t.name.toLowerCase().includes('usuario')
  );
  
  if (userTables.length > 0) {
    console.log(`\n👤 Tablas relacionadas con usuarios:`);
    userTables.forEach(table => {
      console.log(`\n📋 Estructura de ${table.name}:`);
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      columns.forEach(col => {
        console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // Mostrar algunos datos de ejemplo
      try {
        const sampleData = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
        if (sampleData.length > 0) {
          console.log(`   📄 Datos de ejemplo:`);
          sampleData.forEach((row, index) => {
            console.log(`     ${index + 1}. ${JSON.stringify(row)}`);
          });
        } else {
          console.log(`   📄 No hay datos en esta tabla`);
        }
      } catch (error) {
        console.log(`   ❌ Error al leer datos: ${error.message}`);
      }
    });
  }
  
  db.close();
  console.log('\n🏁 Verificación completada');
  
} catch (error) {
  console.error('❌ Error al acceder a la base de datos:', error.message);
  console.log('💡 Posibles causas:');
  console.log('   - El archivo almacen.db no existe');
  console.log('   - No hay permisos para leer el archivo');
  console.log('   - La base de datos está corrupta');
}