// Script para debuggear el estado de autenticación del usuario

// Función para verificar el estado de autenticación
function debugUserAuth() {
  console.log('🔍 Debuggeando estado de autenticación...');
  
  // 1. Verificar localStorage
  console.log('\n1️⃣ Verificando localStorage:');
  const sessionKey = 'almacen_auth_session';
  const sessionData = localStorage.getItem(sessionKey);
  
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      console.log('✅ Sesión encontrada en localStorage:');
      console.log('- Usuario ID:', session.user?.id);
      console.log('- Email:', session.user?.email);
      console.log('- Rol:', session.user?.rol);
      console.log('- Obra ID:', session.user?.obra_id);
      console.log('- Token expira en:', new Date(session.expiresAt));
      console.log('- ¿Token válido?:', Date.now() < session.expiresAt);
      
      return session;
    } catch (error) {
      console.error('❌ Error al parsear sesión:', error);
    }
  } else {
    console.log('❌ No se encontró sesión en localStorage');
  }
  
  return null;
}

// Función para verificar datos en IndexedDB
async function debugLocalDB() {
  console.log('\n2️⃣ Verificando base de datos local...');
  
  try {
    // Abrir IndexedDB
    const request = indexedDB.open('almacen_db', 1);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const db = event.target.result;
        
        // Verificar usuarios
        const transaction = db.transaction(['usuarios'], 'readonly');
        const store = transaction.objectStore('usuarios');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const usuarios = getAllRequest.result;
          console.log('✅ Usuarios en base de datos local:');
          usuarios.forEach(user => {
            console.log(`- ${user.email} (${user.rol}) - Activo: ${user.activo}`);
          });
          
          // Buscar usuario de coordinación
          const coordinador = usuarios.find(u => u.rol === 'COORDINACION' && u.activo);
          if (coordinador) {
            console.log('✅ Usuario coordinador encontrado:', coordinador.email);
          } else {
            console.log('❌ No se encontró usuario coordinador activo');
          }
          
          resolve(usuarios);
        };
        
        getAllRequest.onerror = () => {
          console.error('❌ Error al obtener usuarios');
          reject(getAllRequest.error);
        };
      };
      
      request.onerror = () => {
        console.error('❌ Error al abrir IndexedDB');
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error al acceder a IndexedDB:', error);
  }
}

// Función principal
async function runDebug() {
  console.log('🚀 Iniciando debug de autenticación...');
  
  const session = debugUserAuth();
  await debugLocalDB();
  
  console.log('\n📋 Resumen:');
  if (session && session.user?.rol === 'COORDINACION') {
    console.log('✅ Usuario de coordinación autenticado correctamente');
    console.log('- ID:', session.user.id);
    console.log('- Email:', session.user.email);
  } else {
    console.log('❌ Usuario de coordinación NO autenticado o no encontrado');
  }
}

// Ejecutar debug
runDebug().catch(console.error);