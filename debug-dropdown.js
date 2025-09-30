// This script should be run in the browser console, not in Node.js
// Copy and paste this code in the browser developer console

// Test script to debug dropdown issues
const testObrasDropdown = () => {
  console.log('🔍 Testing obras dropdown...')
  
  // Check if obras data is loaded
  const obraSelect = document.querySelector('[data-testid="obra-select"]') || 
                    document.querySelector('select[name="obra_id"]') ||
                    document.querySelector('[role="combobox"]')
  
  if (obraSelect) {
    console.log('✅ Found obra select element:', obraSelect)
    console.log('📊 Element styles:', window.getComputedStyle(obraSelect))
  } else {
    console.log('❌ Obra select element not found')
  }
  
  // Check for Radix Select components
  const selectTriggers = document.querySelectorAll('[data-radix-select-trigger]')
  console.log('📋 Found select triggers:', selectTriggers.length)
  
  selectTriggers.forEach((trigger, index) => {
    console.log(`🎯 Trigger ${index}:`, {
      element: trigger,
      visible: trigger.offsetParent !== null,
      zIndex: window.getComputedStyle(trigger).zIndex,
      position: window.getComputedStyle(trigger).position,
      overflow: window.getComputedStyle(trigger).overflow
    })
    
    // Try to click the trigger
    trigger.addEventListener('click', () => {
      console.log('🖱️ Trigger clicked!')
      setTimeout(() => {
        const content = document.querySelector('[data-radix-select-content]')
        if (content) {
          console.log('✅ Content appeared:', content)
          console.log('📊 Content styles:', {
            display: window.getComputedStyle(content).display,
            visibility: window.getComputedStyle(content).visibility,
            zIndex: window.getComputedStyle(content).zIndex,
            position: window.getComputedStyle(content).position,
            transform: window.getComputedStyle(content).transform
          })
        } else {
          console.log('❌ No content found after click')
        }
      }, 100)
    })
  })
  
  // Check for overflow containers that might clip the dropdown
  const containers = document.querySelectorAll('div')
  let clippingContainers = []
  
  containers.forEach(container => {
    const styles = window.getComputedStyle(container)
    if (styles.overflow === 'hidden' || styles.overflowY === 'hidden' || styles.overflowX === 'hidden') {
      clippingContainers.push({
        element: container,
        overflow: styles.overflow,
        overflowX: styles.overflowX,
        overflowY: styles.overflowY,
        position: styles.position,
        zIndex: styles.zIndex
      })
    }
  })
  
  if (clippingContainers.length > 0) {
    console.log('⚠️ Found containers with overflow hidden:', clippingContainers)
  }
}

// Auto-run the test
testObrasDropdown()

console.log('🚀 Debug script loaded. Try clicking on the obra dropdown and check the logs.')