// Script de debug para verificar servicios
import { materialesService } from './src/services/materiales.js';
import { obrasService } from './src/services/obras.js';

async function testServices() {
  console.log('🔍 Probando servicios...');
  
  try {
    console.log('\n📦 Probando materialesService.getAll()...');
    const materiales = await materialesService.getAll();
    console.log('✅ Materiales obtenidos:', materiales.length);
    console.log('📋 Primeros 3 materiales:', materiales.slice(0, 3));
    
    console.log('\n🏗️ Probando obrasService.getAll()...');
    const obras = await obrasService.getAll();
    console.log('✅ Obras obtenidas:', obras.length);
    console.log('📋 Obras:', obras);
    
  } catch (error) {
    console.error('❌ Error en servicios:', error);
  }
}

testServices();