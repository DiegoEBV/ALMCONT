const puppeteer = require('puppeteer');

async function debugDashboard() {
  console.log('🔍 Iniciando debug del dashboard en el navegador...');
  
  const browser = await puppeteer.launch({
    headless: false, // Mostrar el navegador
    devtools: true,  // Abrir DevTools
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capturar todos los logs de la consola
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`🖥️ [${type.toUpperCase()}] ${text}`);
  });
  
  // Capturar errores de la página
  page.on('pageerror', error => {
    console.error('❌ Error de página:', error.message);
  });
  
  // Capturar errores de red
  page.on('requestfailed', request => {
    console.error('❌ Request fallido:', request.url(), request.failure()?.errorText);
  });
  
  try {
    console.log('🌐 Navegando a http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('⏳ Esperando 5 segundos para que cargue completamente...');
    await page.waitForTimeout(5000);
    
    // Verificar si estamos en la página de login o dashboard
    const currentUrl = page.url();
    console.log('📍 URL actual:', currentUrl);
    
    const title = await page.title();
    console.log('📄 Título de la página:', title);
    
    // Buscar elementos del dashboard
    const dashboardElements = await page.evaluate(() => {
      const requerimientosElement = document.querySelector('h3:contains("Requerimientos Pendientes")');
      const stockElement = document.querySelector('h3:contains("Stock Bajo")');
      const entradasElement = document.querySelector('h3:contains("Entradas del Mes")');
      const salidasElement = document.querySelector('h3:contains("Salidas del Mes")');
      
      // Buscar por texto alternativo
      const allH3 = Array.from(document.querySelectorAll('h3'));
      const dashboardH3s = allH3.filter(h3 => 
        h3.textContent.includes('Requerimientos') ||
        h3.textContent.includes('Stock') ||
        h3.textContent.includes('Entradas') ||
        h3.textContent.includes('Salidas')
      );
      
      return {
        foundDashboardElements: dashboardH3s.length > 0,
        dashboardTexts: dashboardH3s.map(h3 => h3.textContent),
        allH3Texts: allH3.map(h3 => h3.textContent)
      };
    });
    
    console.log('🔍 Elementos del dashboard encontrados:', dashboardElements.foundDashboardElements);
    console.log('📊 Textos del dashboard:', dashboardElements.dashboardTexts);
    console.log('📝 Todos los H3:', dashboardElements.allH3Texts);
    
    // Buscar valores numéricos en el dashboard
    const dashboardValues = await page.evaluate(() => {
      const values = [];
      const numberElements = document.querySelectorAll('.text-3xl, .font-bold');
      numberElements.forEach(el => {
        if (el.textContent.match(/^\d+$/)) {
          values.push({
            text: el.textContent,
            parent: el.parentElement?.textContent || 'No parent'
          });
        }
      });
      return values;
    });
    
    console.log('🔢 Valores numéricos encontrados:', dashboardValues);
    
    // Verificar si hay elementos de login
    const loginElements = await page.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passwordInput = document.querySelector('input[type="password"]');
      const loginButton = document.querySelector('button[type="submit"]');
      
      return {
        hasEmailInput: !!emailInput,
        hasPasswordInput: !!passwordInput,
        hasLoginButton: !!loginButton,
        isLoginPage: !!(emailInput && passwordInput && loginButton)
      };
    });
    
    console.log('🔐 Elementos de login:', loginElements);
    
    if (loginElements.isLoginPage) {
      console.log('⚠️ La aplicación está mostrando la página de login, no el dashboard');
      console.log('💡 Esto indica que el usuario no está autenticado');
    }
    
    console.log('⏳ Esperando 10 segundos más para observar cambios...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error durante el debug:', error);
  } finally {
    console.log('🔚 Cerrando navegador...');
    await browser.close();
  }
}

debugDashboard().catch(console.error);