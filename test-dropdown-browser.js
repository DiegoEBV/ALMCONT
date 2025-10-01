/*
=== INSTRUCCIONES PARA PROBAR EL DROPDOWN DE OBRAS ===

1. Abrir http://localhost:5173/ en el navegador
2. Hacer login con: coordinador@obra.com / password123
3. Navegar a "Nuevo Requerimiento de Materiales"
4. Abrir la consola del navegador (F12)
5. Copiar y pegar TODO este código en la consola
6. Presionar Enter para ejecutar

*/

console.log('🔍 === DIAGNÓSTICO DEL DROPDOWN DE OBRAS ===');

// Función principal de diagnóstico
function diagnosticarDropdown() {
    console.log('📍 URL actual:', window.location.href);
    
    // Verificar si estamos en la página correcta
    if (!window.location.href.includes('create-requirement') && !window.location.href.includes('nuevo')) {
        console.log('⚠️  No estás en la página de crear requerimiento');
        console.log('📝 Navega a "Nuevo Requerimiento de Materiales" primero');
        return;
    }
    
    // Buscar el dropdown de obras
    const obraSelect = document.querySelector('[data-testid="obra-select"]');
    const allSelects = document.querySelectorAll('select, [role="combobox"], [data-radix-select-trigger]');
    
    console.log('🎯 Dropdown de obras encontrado:', !!obraSelect);
    console.log('📊 Total de elementos select en la página:', allSelects.length);
    
    if (!obraSelect) {
        console.log('❌ No se encontró el dropdown con data-testid="obra-select"');
        console.log('🔍 Elementos select disponibles:');
        allSelects.forEach((select, i) => {
            console.log(`  ${i + 1}. ${select.tagName} - ${select.className}`);
        });
        return;
    }
    
    // Analizar estilos del trigger
    const triggerStyles = window.getComputedStyle(obraSelect);
    console.log('🎨 Estilos del trigger:', {
        display: triggerStyles.display,
        visibility: triggerStyles.visibility,
        opacity: triggerStyles.opacity,
        zIndex: triggerStyles.zIndex,
        position: triggerStyles.position,
        pointerEvents: triggerStyles.pointerEvents
    });
    
    // Verificar contenedores padre problemáticos
    console.log('🔍 Analizando contenedores padre...');
    let parent = obraSelect.parentElement;
    let level = 0;
    while (parent && level < 5) {
        const parentStyles = window.getComputedStyle(parent);
        const hasOverflowIssue = parentStyles.overflow !== 'visible' && parentStyles.overflow !== 'auto';
        const hasZIndexIssue = parentStyles.zIndex !== 'auto' && parseInt(parentStyles.zIndex) > 50;
        
        if (hasOverflowIssue || hasZIndexIssue) {
            console.log(`⚠️  Contenedor problemático nivel ${level}:`, {
                element: parent.tagName + (parent.className ? '.' + parent.className.split(' ').join('.') : ''),
                overflow: parentStyles.overflow,
                zIndex: parentStyles.zIndex,
                position: parentStyles.position
            });
        }
        parent = parent.parentElement;
        level++;
    }
    
    // Simular click y analizar el contenido
    console.log('🖱️  Simulando click en el dropdown...');
    obraSelect.click();
    
    setTimeout(() => {
        const selectContent = document.querySelector('[data-radix-select-content]');
        console.log('📋 Contenido del dropdown encontrado:', !!selectContent);
        
        if (selectContent) {
            const contentStyles = window.getComputedStyle(selectContent);
            console.log('🎨 Estilos del contenido:', {
                display: contentStyles.display,
                visibility: contentStyles.visibility,
                opacity: contentStyles.opacity,
                zIndex: contentStyles.zIndex,
                position: contentStyles.position,
                top: contentStyles.top,
                left: contentStyles.left,
                transform: contentStyles.transform,
                maxHeight: contentStyles.maxHeight,
                overflow: contentStyles.overflow
            });
            
            const items = selectContent.querySelectorAll('[data-radix-select-item]');
            console.log('📝 Número de items en el dropdown:', items.length);
            
            if (items.length > 0) {
                console.log('✅ Items encontrados:');
                items.forEach((item, index) => {
                    console.log(`  ${index + 1}. "${item.textContent.trim()}"`);
                });
            } else {
                console.log('❌ No hay items en el dropdown');
                console.log('🔍 Contenido HTML del dropdown:', selectContent.innerHTML);
            }
            
            // Verificar si el contenido está siendo cortado
            const rect = selectContent.getBoundingClientRect();
            console.log('📐 Posición y tamaño del dropdown:', {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                bottom: rect.bottom,
                right: rect.right,
                visible: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
            });
        } else {
            console.log('❌ No se encontró el contenido del dropdown');
            console.log('🔍 Buscando elementos Radix UI...');
            const radixElements = document.querySelectorAll('[data-radix-select-content], [data-radix-popper-content-wrapper]');
            console.log('📊 Elementos Radix encontrados:', radixElements.length);
        }
        
        // Verificar datos de obras en el DOM
        console.log('\n📊 === VERIFICANDO DATOS DE OBRAS ===');
        const bodyText = document.body.textContent;
        const hasObrasData = bodyText.includes('Edificio Residencial Los Pinos') || 
                           bodyText.includes('Centro Comercial Plaza Norte') ||
                           bodyText.includes('OBR-2024');
        
        if (hasObrasData) {
            console.log('✅ Se encontraron datos de obras en la página');
        } else {
            console.log('❌ No se encontraron datos de obras en la página');
            console.log('🔍 Esto podría indicar un problema de carga de datos');
        }
        
        // Cerrar el dropdown
        setTimeout(() => {
            document.body.click();
            console.log('\n🎯 === RESUMEN DEL DIAGNÓSTICO ===');
            console.log('Si el dropdown no se muestra, las posibles causas son:');
            console.log('1. 🔄 Datos no cargados correctamente');
            console.log('2. 🎨 Problemas de CSS/z-index');
            console.log('3. 📦 Contenedores padre con overflow problemático');
            console.log('4. 🖱️  Eventos de click no funcionando');
            console.log('\n📋 Revisa los logs anteriores para identificar el problema específico.');
        }, 500);
    }, 300);
}

// Ejecutar diagnóstico
diagnosticarDropdown();