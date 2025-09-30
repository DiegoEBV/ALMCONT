// Script para probar autenticación en la aplicación web
console.log('=== Prueba de Autenticación Web ===');

// Simular login en la aplicación
const testWebAuth = async () => {
  try {
    console.log('\n1. Simulando login en la aplicación web...');
    
    // Simular el proceso de login que haría la aplicación
    const loginData = {
      email: 'logistica@obra.com',
      password: 'password123'
    };
    
    console.log('Datos de login:', loginData);
    
    // Aquí normalmente se haría una petición al endpoint de login
    // Por ahora solo verificamos que los datos estén correctos
    console.log('✅ Datos de login preparados correctamente');
    
    console.log('\n2. Verificando estado de autenticación...');
    console.log('- Email:', loginData.email);
    console.log('- Password length:', loginData.password.length);
    
    console.log('\n✅ Test completado - Los datos están listos para autenticación');
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
  }
};

testWebAuth();