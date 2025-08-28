const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/widgets', express.static(path.join(__dirname, 'widgets')));

const ensureDataDir = () => {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const files = {
    'config.json': { 
      theme: 'light', 
      refreshInterval: 300000,
      weather: {
        defaultLocation: 'auto',
        locations: [],
        refreshInterval: 300000
      }
    },
    'calendars.json': [],
    'credentials.json': {}
  };
  
  Object.keys(files).forEach(filename => {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(files[filename], null, 2));
    }
  });
};

const readJsonFile = (filename) => {
  const filePath = path.join(__dirname, 'data', filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return null;
  }
};

const writeJsonFile = (filename, data) => {
  const filePath = path.join(__dirname, 'data', filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/calendars', (req, res) => {
  const calendars = readJsonFile('calendars.json');
  res.json(calendars || []);
});

app.post('/api/calendars', (req, res) => {
  console.log('POST /api/calendars - Request body:', req.body);
  
  // Validate required fields
  if (!req.body || !req.body.name || !req.body.url) {
    console.log('Missing required fields:', { name: req.body?.name, url: req.body?.url });
    return res.status(400).json({ error: 'Missing required fields: name and url' });
  }
  
  const calendars = readJsonFile('calendars.json') || [];
  const newCalendar = {
    id: Date.now().toString(),
    name: req.body.name,
    url: req.body.url,
    enabled: true,
    refreshInterval: req.body.refreshInterval || 300000
  };
  
  console.log('Creating new calendar:', newCalendar);
  
  calendars.push(newCalendar);
  
  if (writeJsonFile('calendars.json', calendars)) {
    console.log('Calendar saved successfully');
    res.json(newCalendar);
  } else {
    console.log('Failed to write calendars.json file');
    res.status(500).json({ error: 'Failed to save calendar' });
  }
});

app.delete('/api/calendars/:id', (req, res) => {
  const calendars = readJsonFile('calendars.json') || [];
  const filteredCalendars = calendars.filter(cal => cal.id !== req.params.id);
  
  if (writeJsonFile('calendars.json', filteredCalendars)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete calendar' });
  }
});

// Legacy OAuth endpoints removed - using local Sonos control

app.get('/api/config', (req, res) => {
  const config = readJsonFile('config.json');
  res.json(config || {});
});

app.post('/api/config', (req, res) => {
  if (writeJsonFile('config.json', req.body)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Initialize Sonos service
const sonosService = require('./services/sonos-service');

// Sonos API endpoints
app.get('/api/sonos/devices', async (req, res) => {
  try {
    await sonosService.initialize();
    const devices = sonosService.getDevices();
    res.json({ devices });
  } catch (error) {
    console.error('Error getting Sonos devices:', error);
    res.status(500).json({ error: 'Failed to discover Sonos devices', details: error.message });
  }
});

app.post('/api/sonos/devices/refresh', async (req, res) => {
  try {
    const devices = await sonosService.refreshDevices();
    res.json({ devices, refreshed: true });
  } catch (error) {
    console.error('Error refreshing Sonos devices:', error);
    res.status(500).json({ error: 'Failed to refresh Sonos devices', details: error.message });
  }
});

app.get('/api/sonos/devices/:uuid/state', async (req, res) => {
  try {
    const state = await sonosService.getPlaybackState(req.params.uuid);
    res.json(state);
  } catch (error) {
    console.error('Error getting playback state:', error);
    res.status(500).json({ error: 'Failed to get playback state', details: error.message });
  }
});

app.post('/api/sonos/devices/:uuid/play', async (req, res) => {
  try {
    const result = await sonosService.play(req.params.uuid);
    res.json(result);
  } catch (error) {
    console.error('Error playing:', error);
    res.status(500).json({ error: 'Failed to play', details: error.message });
  }
});

app.post('/api/sonos/devices/:uuid/pause', async (req, res) => {
  try {
    const result = await sonosService.pause(req.params.uuid);
    res.json(result);
  } catch (error) {
    console.error('Error pausing:', error);
    res.status(500).json({ error: 'Failed to pause', details: error.message });
  }
});

app.post('/api/sonos/devices/:uuid/next', async (req, res) => {
  try {
    const result = await sonosService.next(req.params.uuid);
    res.json(result);
  } catch (error) {
    console.error('Error skipping to next:', error);
    res.status(500).json({ error: 'Failed to skip to next', details: error.message });
  }
});

app.post('/api/sonos/devices/:uuid/previous', async (req, res) => {
  try {
    const result = await sonosService.previous(req.params.uuid);
    res.json(result);
  } catch (error) {
    console.error('Error skipping to previous:', error);
    res.status(500).json({ error: 'Failed to skip to previous', details: error.message });
  }
});

app.post('/api/sonos/devices/:uuid/volume', async (req, res) => {
  try {
    const volume = req.body.volume;
    if (volume === undefined) {
      return res.status(400).json({ error: 'Volume level required' });
    }
    const result = await sonosService.setVolume(req.params.uuid, volume);
    res.json(result);
  } catch (error) {
    console.error('Error setting volume:', error);
    res.status(500).json({ error: 'Failed to set volume', details: error.message });
  }
});

app.post('/api/sonos/devices/:uuid/mute', async (req, res) => {
  try {
    const result = await sonosService.mute(req.params.uuid);
    res.json(result);
  } catch (error) {
    console.error('Error muting:', error);
    res.status(500).json({ error: 'Failed to mute', details: error.message });
  }
});

app.post('/api/sonos/devices/:uuid/unmute', async (req, res) => {
  try {
    const result = await sonosService.unmute(req.params.uuid);
    res.json(result);
  } catch (error) {
    console.error('Error unmuting:', error);
    res.status(500).json({ error: 'Failed to unmute', details: error.message });
  }
});

// Weather API endpoints
app.get('/api/weather/locations', (req, res) => {
  const config = readJsonFile('config.json') || {};
  const weather = config.weather || { locations: [] };
  res.json(weather.locations);
});

app.post('/api/weather/locations', (req, res) => {
  const { name, latitude, longitude, country, timezone } = req.body;
  
  if (!name || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required fields: name, latitude, longitude' });
  }
  
  const config = readJsonFile('config.json') || {};
  if (!config.weather) {
    config.weather = { defaultLocation: 'auto', locations: [], refreshInterval: 300000 };
  }
  
  const newLocation = {
    id: Date.now().toString(),
    name,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    country: country || '',
    timezone: timezone || ''
  };
  
  config.weather.locations.push(newLocation);
  
  if (writeJsonFile('config.json', config)) {
    res.json(newLocation);
  } else {
    res.status(500).json({ error: 'Failed to save location' });
  }
});

app.delete('/api/weather/locations/:id', (req, res) => {
  const config = readJsonFile('config.json') || {};
  if (!config.weather) {
    return res.status(404).json({ error: 'Weather config not found' });
  }
  
  config.weather.locations = config.weather.locations.filter(loc => loc.id !== req.params.id);
  
  if (writeJsonFile('config.json', config)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

app.post('/api/weather/default-location', (req, res) => {
  const { locationId } = req.body;
  
  const config = readJsonFile('config.json') || {};
  if (!config.weather) {
    config.weather = { defaultLocation: 'auto', locations: [], refreshInterval: 300000 };
  }
  
  config.weather.defaultLocation = locationId || 'auto';
  
  if (writeJsonFile('config.json', config)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save default location' });
  }
});

ensureDataDir();

const getLocalIP = () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

app.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log(`
🐕 DogeAssistant Dashboard Server Started!

📱 Widget Dashboard: http://${localIP}:${PORT}/
⚙️  Management Panel: http://${localIP}:${PORT}/admin
🏠 Local Access: http://localhost:${PORT}/

Server running on port ${PORT}
  `);
});