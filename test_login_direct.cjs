const puppeteer = require('puppeteer');

async function testLoginDirect() {
  console.log('🚀 Iniciando prueba de login directo...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Habilitar logs de consola del navegador
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[BROWSER ${type.toUpperCase()}]:`, text);
  });
  
  // Capturar errores de la página
  page.on('pageerror', error => {
    console.error('❌ [PAGE ERROR]:', error.message);
  });
  
  // Capturar errores de red
  page.on('requestfailed', request => {
    console.error('❌ [NETWORK ERROR]:', request.url(), request.failure()?.errorText);
  });
  
  try {
    console.log('📍 Navegando a http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    console.log('⏳ Esperando que aparezcan los campos de login...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    
    console.log('✅ Campos de login encontrados');
    
    // Limpiar campos antes de escribir
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.type('input[type="email"]', 'coordinador@obra.com');
    
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', 'password123');
    
    console.log('📝 Credenciales ingresadas: coordinador@obra.com / password123');
    
    // Verificar que los campos tienen los valores correctos
    const emailValue = await page.$eval('input[type="email"]', el => el.value);
    const passwordValue = await page.$eval('input[type="password"]', el => el.value);
    
    console.log('🔍 Valores en los campos:');
    console.log('   Email:', emailValue);
    console.log('   Password:', passwordValue);
    
    if (emailValue !== 'coordinador@obra.com' || passwordValue !== 'password123') {
      console.error('❌ Los valores en los campos no coinciden con lo esperado');
      return;
    }
    
    console.log('🔐 Haciendo clic en el botón de login...');
    await page.click('button[type="submit"]');
    
    console.log('⏳ Esperando respuesta del login...');
    
    // Esperar hasta 15 segundos para ver qué pasa
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Verificar la URL actual
    const currentUrl = page.url();
    console.log('📍 URL actual:', currentUrl);
    
    // Verificar si hay mensajes de error
    const errorElements = await page.$$('.text-red-800, .text-red-600, .bg-red-50');
    if (errorElements.length > 0) {
      console.log('❌ Elementos de error encontrados:');
      for (const errorEl of errorElements) {
        const errorText = await page.evaluate(el => el.textContent, errorEl);
        console.log('   -', errorText);
      }
    }
    
    // Verificar si estamos en el dashboard
    const dashboardElements = await page.$$('h1, h2, .dashboard');
    if (dashboardElements.length > 0) {
      console.log('✅ Elementos del dashboard encontrados:');
      for (const dashEl of dashboardElements) {
        const dashText = await page.evaluate(el => el.textContent, dashEl);
        console.log('   -', dashText);
      }
    }
    
    // Verificar el estado de autenticación en localStorage
    const authData = await page.evaluate(() => {
      const session = localStorage.getItem('almacen_auth_session');
      return session ? JSON.parse(session) : null;
    });
    
    console.log('🔍 Datos de autenticación en localStorage:', authData);
    
    console.log('⏳ Manteniendo navegador abierto por 30 segundos para inspección manual...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    console.log('🔚 Cerrando navegador...');
    await browser.close();
  }
}

testLoginDirect().catch(console.error);