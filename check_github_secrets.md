# GitHub Secrets Configuration Check

## Required GitHub Secrets for Deployment

Para que el deploy de GitHub Pages funcione correctamente, necesitas configurar estos secrets en tu repositorio:

### 1. VITE_SUPABASE_URL
**Valor:** `https://gqhyrntdedrazmcjndhs.supabase.co`

### 2. VITE_SUPABASE_ANON_KEY
**Valor:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q`

## Cómo configurar los GitHub Secrets:

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, haz clic en **Secrets and variables** > **Actions**
4. Haz clic en **New repository secret**
5. Agrega cada secret con su nombre y valor exacto

## Verificación

Una vez configurados los secrets, el workflow de deploy debería:
- ✅ Mostrar que las variables están definidas en los logs
- ✅ Construir la aplicación correctamente
- ✅ Permitir el login del usuario produccion@obra.com

## Troubleshooting

Si el problema persiste después de configurar los secrets:
1. Verifica que los nombres de los secrets sean exactamente: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
2. Asegúrate de que no haya espacios extra en los valores
3. Fuerza un nuevo deploy haciendo un commit
4. Revisa los logs del workflow para confirmar que las variables se están pasando correctamente