import express from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = express.Router();

router.post('/ingest', async (req, res) => {
  try {
    const token = req.header('x-gps-token');
    const expected = process.env.GPS_INGEST_TOKEN;

    if (!expected || token !== expected) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const {
      imei,
      latitude,
      longitude,
      speed = 0,
      heading = 0,
      satellites = 0,
      battery_level = 100,
      recorded_at = new Date().toISOString()
    } = req.body || {};

    if (!imei || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Datos insuficientes: imei, latitude, longitude' });
    }

    // Find device by IMEI
    const { data: device, error: deviceError } = await supabase
      .from('gps_devices')
      .select('*')
      .eq('imei', imei)
      .single();

    if (deviceError || !device) {
      return res.status(404).json({ error: 'Dispositivo no registrado' });
    }

    // Insert location
    const locationPayload: {
      device_id: number;
      latitude: number;
      longitude: number;
      speed: number;
      heading: number;
      satellites: number;
      battery_level: number;
      recorded_at: string;
    } = {
      device_id: device.id,
      latitude,
      longitude,
      speed,
      heading,
      satellites,
      battery_level,
      recorded_at
    };

    const { data: location, error: locationError } = await supabase
      .from('gps_locations')
      .insert([locationPayload])
      .select()
      .single();

    if (locationError) {
      return res.status(400).json({ error: 'Error al registrar ubicación GPS' });
    }

    // Update vehicle current location if device is linked
    if (device.vehicle_id) {
      await supabase
        .from('vehicles')
        .update({ current_location_id: location.id })
        .eq('id', device.vehicle_id);
    }

    return res.status(201).json({ ok: true, location });
  } catch (error) {
    console.error('Error in POST /ingest route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// Get all vehicles with their current locations (optional auth)
router.get('/vehicles', optionalAuth, async (req, res) => {
  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*');

    if (error) {
      console.error('Error fetching vehicles:', error);
      return res.json([]);
    }

    res.json(vehicles || []);
  } catch (error) {
    console.error('Error in /vehicles route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get vehicle by ID with location history (optional auth)
router.get('/vehicles/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    // Get vehicle details
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select(`
        *,
        current_location:gps_locations!vehicles_current_location_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (vehicleError) {
      console.error('Error fetching vehicle:', vehicleError);
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    // Get location history
    const { data: locations, error: locationsError } = await supabase
      .from('gps_locations')
      .select('*')
      .eq('vehicle_id', id)
      .order('recorded_at', { ascending: false })
      .limit(Number(limit));

    if (locationsError) {
      console.error('Error fetching locations:', locationsError);
      return res.status(500).json({ error: 'Error al obtener historial de ubicaciones' });
    }

    res.json({
      ...vehicle,
      location_history: locations || []
    });
  } catch (error) {
    console.error('Error in /vehicles/:id route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Create new vehicle (requires auth)
router.post('/vehicles', optionalAuth, async (req, res) => {
  try {
    const vehicleData = req.body;

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert([vehicleData])
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      return res.status(400).json({ error: 'Error al crear vehículo' });
    }

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Error in POST /vehicles route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update vehicle (requires auth)
router.put('/vehicles/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const vehicleData = req.body;

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .update(vehicleData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      return res.status(400).json({ error: 'Error al actualizar vehículo' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Error in PUT /vehicles/:id route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Delete vehicle (requires auth)
router.delete('/vehicles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      return res.status(400).json({ error: 'Error al eliminar vehículo' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error in DELETE /vehicles/:id route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get all GPS devices (optional auth)
router.get('/devices', optionalAuth, async (req, res) => {
  try {
    const { data: devices, error } = await supabase
      .from('gps_devices')
      .select(`
        *,
        vehicle:vehicles(*)
      `);

    if (error) {
      console.error('Error fetching GPS devices:', error);
      return res.json([]);
    }

    res.json(devices || []);
  } catch (error) {
    console.error('Error in /devices route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Create new GPS device (requires auth)
router.post('/devices', authenticateToken, async (req, res) => {
  try {
    const deviceData = req.body;

    const { data: device, error } = await supabase
      .from('gps_devices')
      .insert([deviceData])
      .select()
      .single();

    if (error) {
      console.error('Error creating GPS device:', error);
      return res.status(400).json({ error: 'Error al crear dispositivo GPS' });
    }

    res.status(201).json(device);
  } catch (error) {
    console.error('Error in POST /devices route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update GPS device (requires auth)
router.put('/devices/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deviceData = req.body;

    const { data: device, error } = await supabase
      .from('gps_devices')
      .update(deviceData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating GPS device:', error);
      return res.status(400).json({ error: 'Error al actualizar dispositivo GPS' });
    }

    res.json(device);
  } catch (error) {
    console.error('Error in PUT /devices/:id route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get all geofences (optional auth)
router.get('/geofences', optionalAuth, async (req, res) => {
  try {
    const { data: geofences, error } = await supabase
      .from('geofences')
      .select('*');

    if (error) {
      console.error('Error fetching geofences:', error);
      return res.json([]);
    }

    res.json(geofences || []);
  } catch (error) {
    console.error('Error in /geofences route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Create new geofence (requires auth)
router.post('/geofences', authenticateToken, async (req, res) => {
  try {
    const geofenceData = req.body;

    const { data: geofence, error } = await supabase
      .from('geofences')
      .insert([geofenceData])
      .select()
      .single();

    if (error) {
      console.error('Error creating geofence:', error);
      return res.status(400).json({ error: 'Error al crear geocerca' });
    }

    res.status(201).json(geofence);
  } catch (error) {
    console.error('Error in POST /geofences route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update geofence (requires auth)
router.put('/geofences/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const geofenceData = req.body;

    const { data: geofence, error } = await supabase
      .from('geofences')
      .update(geofenceData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating geofence:', error);
      return res.status(400).json({ error: 'Error al actualizar geocerca' });
    }

    res.json(geofence);
  } catch (error) {
    console.error('Error in PUT /geofences/:id route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Delete geofence (requires auth)
router.delete('/geofences/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('geofences')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting geofence:', error);
      return res.status(400).json({ error: 'Error al eliminar geocerca' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error in DELETE /geofences/:id route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get GPS alerts (optional auth)
router.get('/alerts', optionalAuth, async (req, res) => {
  try {
    const { limit = 50, status } = req.query;

    let query = supabase
      .from('gps_alerts')
      .select(`
        *,
        vehicle:vehicles(*),
        geofence:geofences(*)
      `)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('Error fetching GPS alerts:', error);
      return res.json([]);
    }

    res.json(alerts || []);
  } catch (error) {
    console.error('Error in /alerts route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update alert status (requires auth)
router.put('/alerts/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data: alert, error } = await supabase
      .from('gps_alerts')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating alert status:', error);
      return res.status(400).json({ error: 'Error al actualizar estado de alerta' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Error in PUT /alerts/:id/status route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get location history for a vehicle (optional auth)
router.get('/locations/vehicle/:vehicleId', optionalAuth, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { 
      limit = 100, 
      startDate, 
      endDate,
      minSpeed,
      maxSpeed 
    } = req.query;

    let query = supabase
      .from('gps_locations')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('recorded_at', { ascending: false })
      .limit(Number(limit));

    if (startDate) {
      query = query.gte('recorded_at', startDate);
    }

    if (endDate) {
      query = query.lte('recorded_at', endDate);
    }

    if (minSpeed) {
      query = query.gte('speed', Number(minSpeed));
    }

    if (maxSpeed) {
      query = query.lte('speed', Number(maxSpeed));
    }

    const { data: locations, error } = await query;

    if (error) {
      console.error('Error fetching location history:', error);
      return res.status(500).json({ error: 'Error al obtener historial de ubicaciones' });
    }

    res.json(locations || []);
  } catch (error) {
    console.error('Error in /locations/vehicle/:vehicleId route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Add new GPS location (optional auth for dev/testing and internal usage)
router.post('/locations', optionalAuth, async (req, res) => {
  try {
    const {
      device_id,
      latitude,
      longitude,
      speed = 0,
      heading = 0,
      satellites = 0,
      battery_level = 100,
      recorded_at = new Date().toISOString()
    } = req.body || {};

    if (!device_id || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Datos insuficientes: device_id, latitude, longitude' });
    }

    // Insert the new location with valid columns only
    const { data: location, error: locationError } = await supabase
      .from('gps_locations')
      .insert([{ device_id, latitude, longitude, speed, heading, satellites, battery_level, recorded_at }])
      .select()
      .single();

    if (locationError) {
      console.error('Error creating GPS location:', locationError);
      return res.status(400).json({ error: 'Error al registrar ubicación GPS' });
    }

    res.status(201).json(location);
  } catch (error) {
    console.error('Error in POST /locations route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get vehicle assignments (optional auth)
router.get('/assignments', optionalAuth, async (req, res) => {
  try {
    const { data: assignments, error } = await supabase
      .from('vehicle_assignments')
      .select(`
        *,
        vehicle:vehicles(*),
        obra:obras(*)
      `);

    if (error) {
      console.error('Error fetching vehicle assignments:', error);
      return res.status(500).json({ error: 'Error al obtener asignaciones de vehículos' });
    }

    res.json(assignments || []);
  } catch (error) {
    console.error('Error in /assignments route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Create vehicle assignment (requires auth)
router.post('/assignments', authenticateToken, async (req, res) => {
  try {
    const assignmentData = req.body;

    const { data: assignment, error } = await supabase
      .from('vehicle_assignments')
      .insert([assignmentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle assignment:', error);
      return res.status(400).json({ error: 'Error al crear asignación de vehículo' });
    }

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error in POST /assignments route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;