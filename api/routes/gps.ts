import express from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all GPS routes
router.use(authenticateToken);

// Get all vehicles with their current locations
router.get('/vehicles', async (req, res) => {
  try {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        current_location:gps_locations!vehicles_current_location_id_fkey(*)
      `);

    if (error) {
      console.error('Error fetching vehicles:', error);
      return res.status(500).json({ error: 'Error al obtener vehículos' });
    }

    res.json(vehicles || []);
  } catch (error) {
    console.error('Error in /vehicles route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get vehicle by ID with location history
router.get('/vehicles/:id', async (req, res) => {
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

// Create new vehicle
router.post('/vehicles', async (req, res) => {
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

// Update vehicle
router.put('/vehicles/:id', async (req, res) => {
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

// Delete vehicle
router.delete('/vehicles/:id', async (req, res) => {
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

// Get all GPS devices
router.get('/devices', async (req, res) => {
  try {
    const { data: devices, error } = await supabase
      .from('gps_devices')
      .select(`
        *,
        vehicle:vehicles(*)
      `);

    if (error) {
      console.error('Error fetching GPS devices:', error);
      return res.status(500).json({ error: 'Error al obtener dispositivos GPS' });
    }

    res.json(devices || []);
  } catch (error) {
    console.error('Error in /devices route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Create new GPS device
router.post('/devices', async (req, res) => {
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

// Update GPS device
router.put('/devices/:id', async (req, res) => {
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

// Get all geofences
router.get('/geofences', async (req, res) => {
  try {
    const { data: geofences, error } = await supabase
      .from('geofences')
      .select('*');

    if (error) {
      console.error('Error fetching geofences:', error);
      return res.status(500).json({ error: 'Error al obtener geocercas' });
    }

    res.json(geofences || []);
  } catch (error) {
    console.error('Error in /geofences route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Create new geofence
router.post('/geofences', async (req, res) => {
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

// Update geofence
router.put('/geofences/:id', async (req, res) => {
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

// Delete geofence
router.delete('/geofences/:id', async (req, res) => {
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

// Get GPS alerts
router.get('/alerts', async (req, res) => {
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
      return res.status(500).json({ error: 'Error al obtener alertas GPS' });
    }

    res.json(alerts || []);
  } catch (error) {
    console.error('Error in /alerts route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update alert status
router.put('/alerts/:id/status', async (req, res) => {
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

// Get location history for a vehicle
router.get('/locations/vehicle/:vehicleId', async (req, res) => {
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

// Add new GPS location (typically called by GPS devices)
router.post('/locations', async (req, res) => {
  try {
    const locationData = req.body;

    // Insert the new location
    const { data: location, error: locationError } = await supabase
      .from('gps_locations')
      .insert([locationData])
      .select()
      .single();

    if (locationError) {
      console.error('Error creating GPS location:', locationError);
      return res.status(400).json({ error: 'Error al registrar ubicación GPS' });
    }

    // Update vehicle's current location
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({ current_location_id: location.id })
      .eq('id', locationData.vehicle_id);

    if (vehicleError) {
      console.error('Error updating vehicle current location:', vehicleError);
    }

    res.status(201).json(location);
  } catch (error) {
    console.error('Error in POST /locations route:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get vehicle assignments
router.get('/assignments', async (req, res) => {
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

// Create vehicle assignment
router.post('/assignments', async (req, res) => {
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