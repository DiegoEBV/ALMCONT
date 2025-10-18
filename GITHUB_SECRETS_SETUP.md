# 🚨 CONFIGURACIÓN CRÍTICA DE GITHUB SECRETS

## ❌ PROBLEMA ACTUAL
El usuario `produccion@obra.com` NO puede hacer login en GitHub Pages porque **las variables de entorno de Supabase no están configuradas correctamente**.

## ✅ SOLUCIÓN INMEDIATA

### 1. Configurar GitHub Secrets EXACTAMENTE así:

**Ve a tu repositorio → Settings → Secrets and variables → Actions**

#### Secret 1: `VITE_SUPABASE_URL`
```
https://gqhyrntdedrazmcjndhs.supabase.co
```

#### Secret 2: `VITE_SUPABASE_ANON_KEY`
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaHlybnRkZWRyYXptY2puZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzM4MTcsImV4cCI6MjA3MDYwOTgxN30.OhT5KmCBG3JT34qbSJe0Q4XkOlNEbNS9uRXQRLC-k3Q
```

### 2. Verificación de Configuración

**IMPORTANTE**: Los nombres deben ser EXACTAMENTE:
- ✅ `VITE_SUPABASE_URL` (no `SUPABASE_URL`)
- ✅ `VITE_SUPABASE_ANON_KEY` (no `SUPABASE_ANON_KEY`)

### 3. Después de configurar los secrets:

1. **Haz un commit cualquiera** para forzar un nuevo deploy
2. **Espera a que termine el workflow** de GitHub Actions
3. **Prueba el login** en https://diegoebv.github.io/ALMCONT/

## 🔍 VERIFICACIÓN

Una vez configurados los secrets, el workflow mostrará en los logs:
```
VITE_SUPABASE_URL is set: true
VITE_SUPABASE_ANON_KEY is set: true
VITE_SUPABASE_URL length: 45
VITE_SUPABASE_ANON_KEY length: 267
```

## 🎯 RESULTADO ESPERADO

Después de la configuración correcta:
- ✅ Usuario: `produccion@obra.com`
- ✅ Contraseña: `123456`
- ✅ Login exitoso en GitHub Pages

---

**⚠️ NOTA**: Sin estos secrets configurados correctamente, la aplicación NO puede conectarse a Supabase y por eso falla el login.