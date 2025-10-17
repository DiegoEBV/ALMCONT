# Configuración de GitHub Secrets para Supabase

## Problema Identificado
La aplicación está fallando en GitHub Pages con el error "Missing Supabase environment variables" porque las variables de entorno no están configuradas como GitHub Secrets.

## Solución: Configurar GitHub Secrets

### Paso 1: Acceder a la configuración del repositorio
1. Ve a tu repositorio en GitHub: `https://github.com/DiegoEBV/ALMCONT`
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral izquierdo, busca **Secrets and variables**
4. Haz clic en **Actions**

### Paso 2: Agregar las variables de Supabase
Necesitas agregar estos dos secrets:

#### Secret 1: VITE_SUPABASE_URL
- **Nombre**: `VITE_SUPABASE_URL`
- **Valor**: `https://gqhyrntdedrazmcjndhs.supabase.co`

#### Secret 2: VITE_SUPABASE_ANON_KEY
- **Nombre**: `VITE_SUPABASE_ANON_KEY`
- **Valor**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q`

### Paso 3: Verificar la configuración
Una vez agregados los secrets:
1. El workflow de GitHub Actions ya está configurado para usar estas variables
2. El próximo push a la rama `main` activará un nuevo deploy
3. La aplicación debería funcionar correctamente y mostrar los 4 usuarios

## Estado Actual del Código

### ✅ Workflow de GitHub Actions (`.github/workflows/deploy.yml`)
El workflow ya está correctamente configurado para usar las variables:
```yaml
- name: Build
  run: npm run build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

### ✅ Configuración de Supabase (`src/lib/supabase.ts`)
El código ya está configurado para usar las variables correctas:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

### ✅ Variables de desarrollo local (`.env`)
El archivo `.env` ya contiene las variables correctas para desarrollo local.

## Próximos Pasos
1. **URGENTE**: Configurar los GitHub Secrets como se describe arriba
2. Hacer un push para activar el deploy automático
3. Verificar que la aplicación funciona correctamente en GitHub Pages
4. Confirmar que los 4 usuarios aparecen en la página de administración

## Notas Importantes
- Las variables usan el prefijo `VITE_` (no `NEXT_PUBLIC_`) porque este es un proyecto Vite
- Los secrets de GitHub son seguros y no se exponen en los logs públicos
- Una vez configurados, no necesitas volver a configurarlos a menos que cambien las credenciales de Supabase