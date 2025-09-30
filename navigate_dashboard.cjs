const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    
    // Navegar a la página de login
    await page.goto('http://localhost:5173');
    await page.waitForSelector('input[type="email"]', {timeout: 5000});
    
    // Hacer login
    await page.type('input[type="email"]', 'logistica@obra.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Esperar navegación después del login
    await page.waitForNavigation({waitUntil: 'networkidle0'});
    
    // Navegar al dashboard
    await page.goto('http://localhost:5173/dashboard');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Navegado al dashboard exitosamente');
    
    // Mantener el navegador abierto para inspección
    console.log('Navegador mantenido abierto para inspección...');
    
  } catch (error) {
    console.error('❌ Error navegando al dashboard:', error);
  }
})();