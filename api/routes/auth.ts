/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express';
import supabase from '../config/supabase.js';


const router = Router();

/**
 * User Login
 * POST /api/auth/register
 */
router.post('/register', async (_req: Request, _res: Response): Promise<void> => {
  // TODO: Implement register logic
});

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (_req: Request, _res: Response): Promise<void> => {
  // TODO: Implement login logic
});

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (_req: Request, _res: Response): Promise<void> => {
  // TODO: Implement logout logic
});

export default router;

// Seed residente user (service role)
router.post('/seed-residente', async (req: Request, res: Response) => {
  try {
    const email = 'residente@obra.com';
    const { data: existing } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .limit(1);
    if (existing && existing.length > 0) {
      return res.json({ success: true, message: 'Usuario ya existe', user: existing[0] });
    }
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        id: crypto.randomUUID(),
        email,
        nombre: 'Residente',
        apellido: 'Obra',
        rol: 'COORDINADOR',
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) {
      console.error('Seed residente error:', error);
      return res.status(400).json({ success: false, error: 'No se pudo crear usuario' });
    }
    res.json({ success: true, user: data });
  } catch (e) {
    console.error('Seed residente exception:', e);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
});
