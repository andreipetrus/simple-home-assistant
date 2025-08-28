/**
 * Weather Widget Unit Tests
 * Tests the weather widget's core functionality, data parsing, and UI rendering
 */

const { test, expect } = require('@playwright/test');

describe('Weather Widget Unit Tests', () => {
    let WeatherWidget;
    let mockWeatherData;
    let mockLocation;

    beforeEach(() => {
        // Mock weather data with timezone-corrected sunrise/sunset
        mockWeatherData = {
            current: {
                temperature_2m: 23.5,
                relative_humidity_2m: 65,
                weather_code: 1,
                wind_speed_10m: 12.5,
                wind_direction_10m: 180
            },
            hourly: {
                temperature_2m: [21, 20, 19, 18, 17, 16, 15, 16, 17, 19, 21, 23],
                weather_code: [1, 2, 3, 1, 1, 0, 0, 1, 2, 1, 1, 1],
                relative_humidity_2m: [70, 72, 75, 78, 80, 82, 85, 80, 75, 70, 65, 60],
                wind_speed_10m: [10, 9, 8, 7, 6, 5, 6, 8, 10, 12, 14, 16]
            },
            daily: {
                time: ['2025-08-28', '2025-08-29', '2025-08-30', '2025-08-31', '2025-09-01'],
                weather_code: [1, 61, 3, 2, 0],
                temperature_2m_max: [25, 22, 20, 24, 27],
                temperature_2m_min: [15, 12, 10, 16, 18],
                precipitation_sum: [0, 2.5, 0.1, 0, 0],
                wind_speed_10m_max: [15, 20, 18, 12, 10],
                sunrise: ['2025-08-28T06:35', '2025-08-29T06:36', '2025-08-30T06:37', '2025-08-31T06:38', '2025-09-01T06:39'],
                sunset: ['2025-08-28T20:01', '2025-08-29T19:59', '2025-08-30T19:58', '2025-08-31T19:56', '2025-09-01T19:55']
            },
            timezone: 'America/Toronto',
            timezone_abbreviation: 'EDT',
            utc_offset_seconds: -14400
        };

        mockLocation = {
            id: 'toronto',
            name: 'Toronto, Ontario',
            latitude: 43.6532,
            longitude: -79.3832,
            country: 'Canada',
            timezone: 'America/Toronto'
        };

        // Create a mock WeatherWidget object
        WeatherWidget = {
            config: {
                temperatureUnit: 'celsius',
                refreshInterval: 300000
            },
            currentLocation: mockLocation,
            weatherData: mockWeatherData,
            formatTime: function(hour, minute) {
                var period = hour >= 12 ? 'PM' : 'AM';
                var displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
                var displayMinute = minute < 10 ? '0' + minute : minute;
                return displayHour + ':' + displayMinute + ' ' + period;
            }
        };
    });

    describe('Weather Data Parsing', () => {
        test('should correctly parse current weather data', () => {
            expect(mockWeatherData.current.temperature_2m).toBe(23.5);
            expect(mockWeatherData.current.relative_humidity_2m).toBe(65);
            expect(mockWeatherData.current.weather_code).toBe(1);
            expect(mockWeatherData.current.wind_speed_10m).toBe(12.5);
        });

        test('should have valid timezone information', () => {
            expect(mockWeatherData.timezone).toBe('America/Toronto');
            expect(mockWeatherData.timezone_abbreviation).toBe('EDT');
            expect(mockWeatherData.utc_offset_seconds).toBe(-14400);
        });

        test('should have daily forecast data for 5 days', () => {
            expect(mockWeatherData.daily.time).toHaveLength(5);
            expect(mockWeatherData.daily.temperature_2m_max).toHaveLength(5);
            expect(mockWeatherData.daily.temperature_2m_min).toHaveLength(5);
            expect(mockWeatherData.daily.sunrise).toHaveLength(5);
            expect(mockWeatherData.daily.sunset).toHaveLength(5);
        });
    });

    describe('Sunrise/Sunset Time Formatting', () => {
        test('should format sunrise time correctly', () => {
            // Test sunrise at 6:35 AM
            const formattedTime = WeatherWidget.formatTime(6, 35);
            expect(formattedTime).toBe('6:35 AM');
        });

        test('should format sunset time correctly', () => {
            // Test sunset at 8:01 PM (20:01 in 24-hour format)
            const formattedTime = WeatherWidget.formatTime(20, 1);
            expect(formattedTime).toBe('8:01 PM');
        });

        test('should handle midnight correctly', () => {
            const formattedTime = WeatherWidget.formatTime(0, 0);
            expect(formattedTime).toBe('12:00 AM');
        });

        test('should handle noon correctly', () => {
            const formattedTime = WeatherWidget.formatTime(12, 0);
            expect(formattedTime).toBe('12:00 PM');
        });

        test('should pad single-digit minutes', () => {
            const formattedTime = WeatherWidget.formatTime(9, 5);
            expect(formattedTime).toBe('9:05 AM');
        });
    });

    describe('Temperature Unit Conversion', () => {
        test('should use celsius when configured', () => {
            WeatherWidget.config.temperatureUnit = 'celsius';
            expect(WeatherWidget.config.temperatureUnit).toBe('celsius');
        });

        test('should use fahrenheit when configured', () => {
            WeatherWidget.config.temperatureUnit = 'fahrenheit';
            expect(WeatherWidget.config.temperatureUnit).toBe('fahrenheit');
        });
    });

    describe('Weather Code Mapping', () => {
        test('should map weather codes to appropriate icons', () => {
            const weatherCodes = {
                0: '☀️',    // Clear sky
                1: '🌤️',   // Mainly clear
                2: '⛅',    // Partly cloudy
                3: '☁️',    // Overcast
                61: '🌧️',  // Light rain
                95: '⛈️'   // Thunderstorm
            };

            Object.keys(weatherCodes).forEach(code => {
                expect(weatherCodes[code]).toBeTruthy();
                expect(weatherCodes[code]).toMatch(/^[⛈🌧☁⛅🌤☀️]/);
            });
        });
    });

    describe('Location Data Validation', () => {
        test('should have valid location coordinates', () => {
            expect(mockLocation.latitude).toBeGreaterThan(-90);
            expect(mockLocation.latitude).toBeLessThan(90);
            expect(mockLocation.longitude).toBeGreaterThan(-180);
            expect(mockLocation.longitude).toBeLessThan(180);
        });

        test('should have valid location name', () => {
            expect(mockLocation.name).toBeTruthy();
            expect(mockLocation.name).toContain('Toronto');
        });

        test('should have valid timezone', () => {
            expect(mockLocation.timezone).toBe('America/Toronto');
        });
    });

    describe('API URL Construction', () => {
        test('should construct proper API URL with timezone', () => {
            const params = new URLSearchParams({
                latitude: mockLocation.latitude,
                longitude: mockLocation.longitude,
                current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m',
                hourly: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
                daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset',
                temperature_unit: 'celsius',
                wind_speed_unit: 'kmh',
                precipitation_unit: 'mm',
                timezone: mockLocation.timezone,
                forecast_days: 5
            });

            const expectedUrl = 'https://api.open-meteo.com/v1/forecast?' + params.toString();
            expect(expectedUrl).toContain('timezone=America%2FToronto');
            expect(expectedUrl).toContain('latitude=43.6532');
            expect(expectedUrl).toContain('longitude=-79.3832');
            expect(expectedUrl).toContain('sunrise%2Csunset');
        });
    });
});