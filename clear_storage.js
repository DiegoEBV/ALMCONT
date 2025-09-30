// Script para limpiar el localStorage y forzar la recarga de datos
console.log('Limpiando localStorage...');

// Limpiar todos los datos relacionados con la aplicación
localStorage.removeItem('almacen_local_db');
localStorage.removeItem('almacen_auth_session');

console.log('✅ localStorage limpiado exitosamente');
console.log('La aplicación cargará los datos actualizados en el próximo inicio');