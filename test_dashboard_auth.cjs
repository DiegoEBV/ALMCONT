const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Habilitar logs de consola
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.type(), msg.text());
  });
  
  try {
    console.log('Navegando a la aplicación...');
    await page.goto('http://localhost:5173');
    
    // Esperar a que aparezcan los campos de login
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    console.log('Página de login cargada');
    
    // Llenar el formulario de login con credenciales válidas
    await page.type('input[type="email"]', 'coordinador@obra.com');
    await page.type('input[type="password"]', 'password123');
    
    console.log('Credenciales ingresadas, intentando login...');
    
    // Hacer clic en el botón de login
    await page.click('button[type="submit"]');
    
    // Esperar a que se redirija al dashboard o aparezca un error
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar si estamos en el dashboard
    const currentUrl = page.url();
    console.log('URL actual:', currentUrl);
    
    // Buscar elementos del dashboard
    const dashboardElements = await page.$$eval('h1, h2, h3', elements => 
      elements.map(el => el.textContent.trim())
    );
    console.log('Elementos de título encontrados:', dashboardElements);
    
    // Buscar estadísticas del dashboard
    const statsElements = await page.$$eval('[class*="stat"], [class*="card"], [class*="metric"]', elements => 
      elements.map(el => el.textContent.trim())
    );
    console.log('Elementos de estadísticas encontrados:', statsElements);
    
    // Esperar más tiempo para ver logs de consola
    console.log('Esperando logs de consola...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('Error durante la prueba:', error.message);
  } finally {
    await browser.close();
  }
})();