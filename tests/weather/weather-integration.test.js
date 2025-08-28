/**
 * Weather Widget Integration Tests  
 * Tests the weather widget's API integration, data fetching, and server endpoints
 */

const { test, expect } = require('@playwright/test');

describe('Weather Widget Integration Tests', () => {
    let baseURL;
    
    test.beforeAll(async () => {
        baseURL = process.env.BASE_URL || 'http://localhost:3000';
    });

    describe('Weather API Configuration', () => {
        test('should retrieve weather configuration from server', async ({ request }) => {
            const response = await request.get(`${baseURL}/api/config`);
            expect(response.ok()).toBeTruthy();
            
            const config = await response.json();
            expect(config).toHaveProperty('weather');
            expect(config.weather).toHaveProperty('defaultLocation');
            expect(config.weather).toHaveProperty('refreshInterval');
            expect(config.weather.refreshInterval).toBeGreaterThan(0);
        });

        test('should update weather configuration', async ({ request }) => {
            const newConfig = {
                weather: {
                    defaultLocation: 'auto',
                    refreshInterval: 600000, // 10 minutes
                    temperatureUnit: 'fahrenheit'
                }
            };

            const response = await request.post(`${baseURL}/api/config`, {
                data: newConfig
            });
            expect(response.ok()).toBeTruthy();
            
            // Verify the configuration was saved
            const getResponse = await request.get(`${baseURL}/api/config`);
            const config = await getResponse.json();
            expect(config.weather.refreshInterval).toBe(600000);
        });
    });

    describe('Weather Locations Management', () => {
        test('should retrieve weather locations list', async ({ request }) => {
            const response = await request.get(`${baseURL}/api/weather/locations`);
            
            if (response.ok()) {
                const locations = await response.json();
                expect(Array.isArray(locations)).toBeTruthy();
                
                // If locations exist, verify structure
                if (locations.length > 0) {
                    const location = locations[0];
                    expect(location).toHaveProperty('id');
                    expect(location).toHaveProperty('name');
                    expect(location).toHaveProperty('latitude');
                    expect(location).toHaveProperty('longitude');
                }
            }
        });

        test('should add new weather location', async ({ request }) => {
            const newLocation = {
                name: 'Test City, Test Province',
                latitude: 45.4215,
                longitude: -75.6972,
                country: 'Canada',
                timezone: 'America/Toronto'
            };

            const response = await request.post(`${baseURL}/api/weather/locations`, {
                data: newLocation
            });
            
            if (response.ok()) {
                const location = await response.json();
                expect(location).toHaveProperty('id');
                expect(location.name).toBe(newLocation.name);
                expect(location.latitude).toBe(newLocation.latitude);
                expect(location.longitude).toBe(newLocation.longitude);
            }
        });

        test('should delete weather location', async ({ request }) => {
            // First, try to get existing locations
            const getResponse = await request.get(`${baseURL}/api/weather/locations`);
            
            if (getResponse.ok()) {
                const locations = await getResponse.json();
                
                if (locations.length > 0) {
                    const locationId = locations[0].id;
                    const deleteResponse = await request.delete(`${baseURL}/api/weather/locations/${locationId}`);
                    expect(deleteResponse.ok()).toBeTruthy();
                }
            }
        });
    });

    describe('External Weather API Integration', () => {
        test('should successfully fetch data from Open-Meteo API', async ({ request }) => {
            const params = new URLSearchParams({
                latitude: 43.6532,
                longitude: -79.3832,
                current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
                hourly: 'temperature_2m,weather_code',
                daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
                timezone: 'America/Toronto',
                forecast_days: 5
            });

            const response = await request.get(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(data).toHaveProperty('current');
            expect(data).toHaveProperty('hourly');
            expect(data).toHaveProperty('daily');
            expect(data).toHaveProperty('timezone');
            
            // Verify timezone is correct
            expect(data.timezone).toBe('America/Toronto');
            
            // Verify sunrise/sunset data exists and has correct format
            expect(data.daily.sunrise).toBeDefined();
            expect(data.daily.sunset).toBeDefined();
            expect(data.daily.sunrise[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
            expect(data.daily.sunset[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
        });

        test('should handle API failures gracefully', async ({ request }) => {
            // Test with invalid coordinates
            const params = new URLSearchParams({
                latitude: 999,  // Invalid latitude
                longitude: 999, // Invalid longitude
                current: 'temperature_2m',
                timezone: 'Invalid/Timezone'
            });

            const response = await request.get(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
            // Should either return error or handle gracefully
            expect(response.status()).toBeGreaterThanOrEqual(400);
        });
    });

    describe('Geocoding API Integration', () => {
        test('should successfully geocode city names', async ({ request }) => {
            const cityName = 'Toronto';
            const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
            
            const response = await request.get(geocodingUrl);
            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(data).toHaveProperty('results');
            
            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                expect(result).toHaveProperty('name');
                expect(result).toHaveProperty('latitude');
                expect(result).toHaveProperty('longitude');
                expect(result.name).toContain('Toronto');
            }
        });

        test('should handle geocoding failures', async ({ request }) => {
            const invalidCity = 'NonexistentCityName12345';
            const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(invalidCity)}&count=1&language=en&format=json`;
            
            const response = await request.get(geocodingUrl);
            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(data.results).toHaveLength(0);
        });
    });

    describe('IP Geolocation Integration', () => {
        test('should retrieve location from IP', async ({ request }) => {
            const response = await request.get('http://ip-api.com/json/');
            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(data).toHaveProperty('status');
            
            if (data.status === 'success') {
                expect(data).toHaveProperty('city');
                expect(data).toHaveProperty('lat');
                expect(data).toHaveProperty('lon');
                expect(data).toHaveProperty('timezone');
                expect(data.lat).toBeGreaterThan(-90);
                expect(data.lat).toBeLessThan(90);
                expect(data.lon).toBeGreaterThan(-180);
                expect(data.lon).toBeLessThan(180);
            }
        });
    });

    describe('Data Validation', () => {
        test('should validate weather data structure', async ({ request }) => {
            const params = new URLSearchParams({
                latitude: 43.6532,
                longitude: -79.3832,
                current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m',
                hourly: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
                daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset',
                temperature_unit: 'celsius',
                wind_speed_unit: 'kmh',
                precipitation_unit: 'mm',
                timezone: 'America/Toronto',
                forecast_days: 5
            });

            const response = await request.get(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
            const data = await response.json();

            // Validate current weather structure
            expect(data.current.temperature_2m).toBeTypeOf('number');
            expect(data.current.relative_humidity_2m).toBeTypeOf('number');
            expect(data.current.weather_code).toBeTypeOf('number');
            expect(data.current.wind_speed_10m).toBeTypeOf('number');

            // Validate daily data arrays have same length
            expect(data.daily.time).toHaveLength(5);
            expect(data.daily.temperature_2m_max).toHaveLength(5);
            expect(data.daily.temperature_2m_min).toHaveLength(5);
            expect(data.daily.sunrise).toHaveLength(5);
            expect(data.daily.sunset).toHaveLength(5);

            // Validate reasonable temperature ranges
            expect(data.current.temperature_2m).toBeGreaterThan(-50);
            expect(data.current.temperature_2m).toBeLessThan(60);
            expect(data.current.relative_humidity_2m).toBeGreaterThanOrEqual(0);
            expect(data.current.relative_humidity_2m).toBeLessThanOrEqual(100);
        });

        test('should validate sunrise occurs before sunset', async ({ request }) => {
            const params = new URLSearchParams({
                latitude: 43.6532,
                longitude: -79.3832,
                daily: 'sunrise,sunset',
                timezone: 'America/Toronto',
                forecast_days: 1
            });

            const response = await request.get(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
            const data = await response.json();

            const sunrise = data.daily.sunrise[0];
            const sunset = data.daily.sunset[0];
            
            // Parse times to compare
            const sunriseTime = new Date(`${sunrise}:00`);
            const sunsetTime = new Date(`${sunset}:00`);
            
            expect(sunriseTime.getTime()).toBeLessThan(sunsetTime.getTime());
            
            // Verify times are in reasonable ranges
            const sunriseHour = parseInt(sunrise.split('T')[1].split(':')[0]);
            const sunsetHour = parseInt(sunset.split('T')[1].split(':')[0]);
            
            expect(sunriseHour).toBeGreaterThan(4);  // After 4 AM
            expect(sunriseHour).toBeLessThan(9);     // Before 9 AM
            expect(sunsetHour).toBeGreaterThan(17);  // After 5 PM  
            expect(sunsetHour).toBeLessThan(22);     // Before 10 PM
        });
    });
});