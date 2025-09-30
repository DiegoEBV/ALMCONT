// Script para verificar y crear usuario de coordinación si no existe
import { localDB } from './src/lib/localDB.js';

async function checkCoordinationUser() {
  console.log('🔍 Verificando usuario de coordinación...');
  
  try {
    // Obtener todos los usuarios
    const usuarios = await localDB.get('usuarios');
    console.log('📋 Usuarios encontrados:', usuarios.length);
    
    // Buscar usuario de coordinación
    const coordinador = usuarios.find(u => u.rol === 'COORDINACION' && u.activo);
    
    if (coordinador) {
      console.log('✅ Usuario de coordinación encontrado:');
      console.log('- ID:', coordinador.id);
      console.log('- Email:', coordinador.email);
      console.log('- Nombre:', coordinador.nombre, coordinador.apellido);
      console.log('- Activo:', coordinador.activo);
      return coordinador;
    } else {
      console.log('❌ No se encontró usuario de coordinación activo');
      
      // Verificar si existe pero está inactivo
      const coordinadorInactivo = usuarios.find(u => u.rol === 'COORDINACION');
      if (coordinadorInactivo) {
        console.log('⚠️ Usuario de coordinación existe pero está inactivo:', coordinadorInactivo.email);
        
        // Activar usuario
        const updated = await localDB.update('usuarios', coordinadorInactivo.id, { activo: true });
        if (updated) {
          console.log('✅ Usuario de coordinación activado');
          return updated;
        }
      } else {
        console.log('🔧 Creando usuario de coordinación...');
        
        // Crear usuario de coordinación
        const nuevoCoordinador = {
          id: 'coord-001',
          email: 'coordinador@obra.com',
          password: '123456',
          nombre: 'Coordinador',
          apellido: 'Principal',
          rol: 'COORDINACION',
          obra_id: null,
          activo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const created = await localDB.add('usuarios', nuevoCoordinador);
        if (created) {
          console.log('✅ Usuario de coordinación creado:');
          console.log('- Email:', nuevoCoordinador.email);
          console.log('- Password:', nuevoCoordinador.password);
          return created;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error al verificar usuario de coordinación:', error);
  }
  
  return null;
}

// Ejecutar verificación
checkCoordinationUser().then(user => {
  if (user) {
    console.log('\n🎉 Usuario de coordinación listo para usar');
    console.log('📝 Credenciales:');
    console.log('- Email:', user.email);
    console.log('- Password: 123456');
  } else {
    console.log('\n❌ No se pudo configurar usuario de coordinación');
  }
}).catch(console.error);