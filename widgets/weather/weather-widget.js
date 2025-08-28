var WeatherWidget = {
    name: 'Weather',
    icon: '🌤️',
    container: null,
    config: {
        refreshInterval: 300000, // 5 minutes
        defaultLocation: 'auto',
        temperatureUnit: 'fahrenheit' // 'celsius' or 'fahrenheit'
    },
    locations: [],
    currentLocation: null,
    weatherData: null,
    refreshTimer: null,

    init: function() {
        var self = this;
        this.loadConfig()
            .then(function() {
                return self.detectOrLoadLocation();
            })
            .then(function() {
                self.render();
                return self.loadWeatherData();
            })
            .then(function() {
                self.startAutoRefresh();
            })
            .catch(function(error) {
                console.error('Weather widget initialization failed:', error);
                self.showError('Failed to initialize weather widget');
            });
    },

    render: function() {
        var weatherTab = document.getElementById('weatherTab');
        if (!weatherTab) return;
        this.container = weatherTab;

        this.container.innerHTML = 
            '<div class="weather-widget">' +
                '<div class="weather-header">' +
                    '<div class="location-info">' +
                        '<span class="location-name" id="weatherLocationName">Loading...</span>' +
                        '<button class="location-selector-btn" id="weatherLocationBtn" title="Change Location">📍</button>' +
                        '<div class="temp-unit-toggle" id="weatherTempToggle">' +
                            '<button class="temp-unit-btn active" data-unit="fahrenheit">°F</button>' +
                            '<button class="temp-unit-btn" data-unit="celsius">°C</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="weather-controls">' +
                        '<button class="refresh-btn" id="weatherRefreshBtn" title="Refresh Weather">🔄</button>' +
                    '</div>' +
                '</div>' +
                '<div class="weather-content" id="weatherContent">' +
                    '<div class="weather-loading">' +
                        '<div class="loading-spinner"></div>' +
                        '<p>Loading weather...</p>' +
                    '</div>' +
                '</div>' +
                '<div class="location-selector-modal" id="weatherLocationModal" style="display: none;">' +
                    '<div class="modal-content">' +
                        '<div class="modal-header">' +
                            '<h3>Select Location</h3>' +
                            '<button class="modal-close" id="weatherModalClose">×</button>' +
                        '</div>' +
                        '<div class="modal-body">' +
                            '<div class="location-option" data-location="auto">' +
                                '<span class="location-icon">🌍</span>' +
                                '<span class="location-text">Auto-detect (IP-based)</span>' +
                            '</div>' +
                            '<div class="locations-list" id="weatherLocationsList"></div>' +
                            '<div class="add-location-form" id="weatherAddLocationForm" style="display: none;">' +
                                '<input type="text" id="weatherLocationSearch" placeholder="Enter city name (e.g., Bucharest, London, New York)">' +
                                '<div class="form-actions">' +
                                    '<button id="weatherLocationAdd" class="btn-primary">Add Location</button>' +
                                    '<button id="weatherLocationCancel" class="btn-secondary">Cancel</button>' +
                                '</div>' +
                            '</div>' +
                            '<button class="add-location-btn" id="weatherAddLocationBtn">+ Add Custom Location</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        this.bindEvents();
    },

    loadConfig: function() {
        var self = this;
        return Utils.apiRequest('/api/config')
            .then(function(config) {
                if (config.weather) {
                    self.config = Object.assign(self.config, config.weather);
                    self.locations = config.weather.locations || [];
                }
                return Promise.resolve();
            })
            .catch(function(error) {
                console.error('Failed to load weather config:', error);
                return Promise.resolve();
            });
    },

    detectOrLoadLocation: function() {
        var self = this;
        if (this.config.defaultLocation === 'auto') {
            return this.detectLocation();
        } else {
            var location = this.locations.find(function(loc) {
                return loc.id === self.config.defaultLocation;
            });
            if (location) {
                this.currentLocation = location;
                return Promise.resolve();
            } else {
                return this.detectLocation();
            }
        }
    },

    detectLocation: function() {
        var self = this;
        return fetch('http://ip-api.com/json/')
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.status === 'success') {
                    self.currentLocation = {
                        id: 'auto',
                        name: data.city + ', ' + data.regionName,
                        latitude: data.lat,
                        longitude: data.lon,
                        country: data.country,
                        timezone: data.timezone
                    };
                } else {
                    throw new Error('IP geolocation failed');
                }
            })
            .catch(function(error) {
                console.error('Location detection failed:', error);
                // Fallback to a default location (New York)
                self.currentLocation = {
                    id: 'fallback',
                    name: 'New York, NY',
                    latitude: 40.7128,
                    longitude: -74.0060,
                    country: 'United States',
                    timezone: 'America/New_York'
                };
            });
    },

    loadWeatherData: function() {
        var self = this;
        if (!this.currentLocation) return Promise.resolve();

        this.showLoading();
        
        var windSpeedUnit = this.config.temperatureUnit === 'celsius' ? 'kmh' : 'mph';
        var precipitationUnit = this.config.temperatureUnit === 'celsius' ? 'mm' : 'inch';
        
        var params = new URLSearchParams({
            latitude: this.currentLocation.latitude,
            longitude: this.currentLocation.longitude,
            current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m',
            hourly: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset',
            temperature_unit: this.config.temperatureUnit,
            wind_speed_unit: windSpeedUnit,
            precipitation_unit: precipitationUnit,
            forecast_days: 5
        });

        return fetch('https://api.open-meteo.com/v1/forecast?' + params.toString())
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                self.weatherData = data;
                self.renderWeather();
                self.updateLastRefresh();
            })
            .catch(function(error) {
                console.error('Weather data fetch failed:', error);
                self.showError('Failed to load weather data');
            });
    },

    bindEvents: function() {
        var self = this;
        
        var refreshBtn = this.container.querySelector('#weatherRefreshBtn');
        var locationBtn = this.container.querySelector('#weatherLocationBtn');
        var modal = this.container.querySelector('#weatherLocationModal');
        var modalClose = this.container.querySelector('#weatherModalClose');
        var tempToggle = this.container.querySelector('#weatherTempToggle');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                self.loadWeatherData();
            });
        }
        
        if (locationBtn) {
            locationBtn.addEventListener('click', function() {
                self.showLocationModal();
            });
        }
        
        if (modalClose) {
            modalClose.addEventListener('click', function() {
                self.hideLocationModal();
            });
        }
        
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) self.hideLocationModal();
            });

            // Location selection
            modal.addEventListener('click', function(e) {
                var locationOption = e.target.closest('.location-option');
                if (locationOption) {
                    var locationId = locationOption.dataset.location;
                    self.selectLocation(locationId);
                }
            });
        }

        if (tempToggle) {
            tempToggle.addEventListener('click', function(e) {
                if (e.target.classList.contains('temp-unit-btn')) {
                    var unit = e.target.dataset.unit;
                    self.toggleTemperatureUnit(unit);
                }
            });
        }

        // Add location functionality
        var addLocationBtn = this.container.querySelector('#weatherAddLocationBtn');
        var addLocationForm = this.container.querySelector('#weatherAddLocationForm');
        var addBtn = this.container.querySelector('#weatherLocationAdd');
        var cancelBtn = this.container.querySelector('#weatherLocationCancel');

        if (addLocationBtn) {
            addLocationBtn.addEventListener('click', function() {
                self.showAddLocationForm();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                self.hideAddLocationForm();
            });
        }

        if (addBtn) {
            addBtn.addEventListener('click', function() {
                self.addCustomLocation();
            });
        }
    },

    renderWeather: function() {
        if (!this.weatherData) return;

        var current = this.weatherData.current;
        var daily = this.weatherData.daily;
        
        var content = this.container.querySelector('#weatherContent');
        if (!content) return;

        var tempUnit = this.config.temperatureUnit === 'celsius' ? '°C' : '°F';
        var windUnit = this.config.temperatureUnit === 'celsius' ? 'km/h' : 'mph';
        
        content.innerHTML = 
            '<div class="current-weather">' +
                '<div class="current-main">' +
                    '<div class="current-temp">' +
                        '<span class="temp-value">' + Math.round(current.temperature_2m) + tempUnit + '</span>' +
                        '<span class="weather-icon">' + this.getWeatherIcon(current.weather_code) + '</span>' +
                    '</div>' +
                    '<div class="current-details">' +
                        '<div class="weather-description">' + this.getWeatherDescription(current.weather_code) + '</div>' +
                        '<div class="weather-stats">' +
                            '<span>💧 ' + current.relative_humidity_2m + '%</span>' +
                            '<span>💨 ' + Math.round(current.wind_speed_10m) + ' ' + windUnit + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="hourly-weather">' +
                    '<div class="hourly-header">Today\'s Hourly Forecast</div>' +
                    '<div class="hourly-timeline">' +
                        this.renderHourlyForecast() +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="forecast-weather">' +
                '<div class="forecast-header">5-Day Forecast</div>' +
                '<div class="forecast-days">' +
                    this.renderForecastDays() +
                '</div>' +
            '</div>';

        // Update location name
        var locationName = this.container.querySelector('#weatherLocationName');
        if (locationName) {
            locationName.textContent = this.currentLocation.name;
        }

        // Update temperature unit toggle
        this.updateTemperatureUnitToggle();
    },

    renderForecastDays: function() {
        var self = this;
        if (!this.weatherData.daily) return '';
        
        var tempUnit = this.config.temperatureUnit === 'celsius' ? '°C' : '°F';
        var windUnit = this.config.temperatureUnit === 'celsius' ? 'km/h' : 'mph';
        var precipUnit = this.config.temperatureUnit === 'celsius' ? 'mm' : '"';

        return this.weatherData.daily.time.slice(0, 5).map(function(date, index) {
            var dayName = index === 0 ? 'Today' : new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            var maxTemp = Math.round(self.weatherData.daily.temperature_2m_max[index]);
            var minTemp = Math.round(self.weatherData.daily.temperature_2m_min[index]);
            var weatherCode = self.weatherData.daily.weather_code[index];
            var precipitation = self.weatherData.daily.precipitation_sum[index];
            var windSpeed = Math.round(self.weatherData.daily.wind_speed_10m_max[index]);

            return '<div class="forecast-day">' +
                '<div class="forecast-day-name">' + dayName + '</div>' +
                '<div class="forecast-icon">' + self.getWeatherIcon(weatherCode) + '</div>' +
                '<div class="forecast-details">' +
                    '<div class="forecast-temps">' +
                        '<span class="temp-low">' + minTemp + tempUnit + '</span>' +
                        (precipitation > 0 ? '<span class="forecast-rain">🌧️ ' + precipitation + precipUnit + '</span>' : '<span class="forecast-spacer"></span>') +
                        '<span class="temp-high">' + maxTemp + tempUnit + '</span>' +
                    '</div>' +
                    '<div class="forecast-wind">💨 ' + windSpeed + ' ' + windUnit + '</div>' +
                '</div>' +
            '</div>';
        }).join('');
    },

    renderHourlyForecast: function() {
        var self = this;
        if (!this.weatherData.hourly) return '';
        
        var tempUnit = this.config.temperatureUnit === 'celsius' ? '°C' : '°F';
        var now = new Date();
        var currentHour = now.getHours();
        
        var hourlyItems = [];
        
        // Show next 12 hours starting from current hour
        for (var i = 0; i < 12; i++) {
            var hourIndex = currentHour + i;
            if (hourIndex < 24 && this.weatherData.hourly.temperature_2m[hourIndex] !== undefined) {
                var displayHour = hourIndex === 0 ? '12 AM' : 
                                 hourIndex < 12 ? hourIndex + ' AM' : 
                                 hourIndex === 12 ? '12 PM' : 
                                 (hourIndex - 12) + ' PM';
                
                hourlyItems.push(
                    '<div class="hourly-item">' +
                        '<div class="hourly-time">' + displayHour + '</div>' +
                        '<div class="hourly-icon">' + this.getWeatherIcon(this.weatherData.hourly.weather_code[hourIndex]) + '</div>' +
                        '<div class="hourly-temp">' + Math.round(this.weatherData.hourly.temperature_2m[hourIndex]) + tempUnit + '</div>' +
                    '</div>'
                );
            }
        }
        
        return hourlyItems.join('');
    },

    getWeatherIcon: function(code) {
        var icons = {
            0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
            45: '🌫️', 48: '🌫️',
            51: '🌦️', 53: '🌦️', 55: '🌦️',
            56: '🌨️', 57: '🌨️',
            61: '🌧️', 63: '🌧️', 65: '🌧️',
            66: '🌨️', 67: '🌨️',
            71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
            80: '🌦️', 81: '🌧️', 82: '🌧️',
            85: '🌨️', 86: '🌨️',
            95: '⛈️', 96: '⛈️', 99: '⛈️'
        };
        return icons[code] || '🌤️';
    },

    getWeatherDescription: function(code) {
        var descriptions = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing rime fog',
            51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
            56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
            61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            66: 'Light freezing rain', 67: 'Heavy freezing rain',
            71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall', 77: 'Snow grains',
            80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
            85: 'Slight snow showers', 86: 'Heavy snow showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
        };
        return descriptions[code] || 'Unknown';
    },

    showLocationModal: function() {
        var modal = this.container.querySelector('#weatherLocationModal');
        
        this.renderLocationsList();

        if (modal) {
            modal.style.display = 'block';
        }
    },

    hideLocationModal: function() {
        var modal = this.container.querySelector('#weatherLocationModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    selectLocation: function(locationId) {
        var self = this;
        if (locationId === 'auto') {
            this.detectLocation()
                .then(function() {
                    return self.loadWeatherData();
                })
                .then(function() {
                    self.hideLocationModal();
                });
        } else {
            var location = this.locations.find(function(loc) {
                return loc.id === locationId;
            });
            if (location) {
                this.currentLocation = location;
                this.loadWeatherData()
                    .then(function() {
                        self.hideLocationModal();
                    });
            }
        }
    },

    showLoading: function() {
        var content = this.container.querySelector('#weatherContent');
        if (content) {
            content.innerHTML = 
                '<div class="weather-loading">' +
                    '<div class="loading-spinner"></div>' +
                    '<p>Loading weather...</p>' +
                '</div>';
        }
    },

    showError: function(message) {
        var self = this;
        var content = this.container.querySelector('#weatherContent');
        if (content) {
            content.innerHTML = 
                '<div class="weather-error">' +
                    '<div class="error-icon">⚠️</div>' +
                    '<p>' + message + '</p>' +
                    '<button onclick="WeatherWidget.loadWeatherData()">Try Again</button>' +
                '</div>';
        }
    },

    updateLastRefresh: function() {
        var now = new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        // Update global last updated display
        var lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            lastUpdated.textContent = 'Updated: ' + now;
        }
    },

    startAutoRefresh: function() {
        var self = this;
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(function() {
            self.loadWeatherData();
        }, this.config.refreshInterval);
    },

    toggleTemperatureUnit: function(unit) {
        if (this.config.temperatureUnit !== unit) {
            this.config.temperatureUnit = unit;
            this.loadWeatherData();
        }
    },

    updateTemperatureUnitToggle: function() {
        var toggleButtons = this.container.querySelectorAll('.temp-unit-btn');
        toggleButtons.forEach(function(btn) {
            btn.classList.remove('active');
            if (btn.dataset.unit === this.config.temperatureUnit) {
                btn.classList.add('active');
            }
        }.bind(this));
    },

    showAddLocationForm: function() {
        var form = this.container.querySelector('#weatherAddLocationForm');
        var btn = this.container.querySelector('#weatherAddLocationBtn');
        if (form && btn) {
            form.style.display = 'block';
            btn.style.display = 'none';
        }
    },

    hideAddLocationForm: function() {
        var form = this.container.querySelector('#weatherAddLocationForm');
        var btn = this.container.querySelector('#weatherAddLocationBtn');
        if (form && btn) {
            form.style.display = 'none';
            btn.style.display = 'block';
            // Clear form
            var cityInput = this.container.querySelector('#weatherLocationSearch');
            if (cityInput) cityInput.value = '';
        }
    },

    addCustomLocation: function() {
        var cityInput = this.container.querySelector('#weatherLocationSearch');
        if (!cityInput) return;

        var cityName = cityInput.value.trim();
        if (!cityName) {
            alert('Please enter a city name');
            return;
        }

        var self = this;
        // Use Open-Meteo's geocoding API
        var geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(cityName) + '&count=1&language=en&format=json';
        
        fetch(geocodingUrl)
            .then(function(response) {
                return response.json();
            })
            .then(function(geocodingData) {
                if (!geocodingData.results || geocodingData.results.length === 0) {
                    throw new Error('City not found');
                }
                
                var result = geocodingData.results[0];
                var locationData = {
                    name: result.name + (result.admin1 ? ', ' + result.admin1 : '') + (result.country ? ', ' + result.country : ''),
                    latitude: result.latitude,
                    longitude: result.longitude,
                    country: result.country || '',
                    timezone: result.timezone || ''
                };

                return Utils.apiRequest('/api/weather/locations', 'POST', locationData);
            })
            .then(function(response) {
                self.locations.push(response);
                self.hideAddLocationForm();
                self.renderLocationsList();
            })
            .catch(function(error) {
                console.error('Failed to add location:', error);
                if (error.message === 'City not found') {
                    alert('City not found. Please check the spelling and try again.');
                } else {
                    alert('Failed to add location. Please try again.');
                }
            });
    },

    renderLocationsList: function() {
        var locationsList = this.container.querySelector('#weatherLocationsList');
        if (!locationsList) return;

        locationsList.innerHTML = this.locations.map(function(location) {
            var locationName = location.name || 'Unknown Location';
            var escapedName = locationName.replace(/[<>&"']/g, function(match) {
                return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[match];
            });
            return '<div class="location-option" data-location="' + location.id + '">' +
                '<span class="location-icon">📍</span>' +
                '<span class="location-text">' + escapedName + '</span>' +
                '<button class="location-remove" data-location="' + location.id + '" onclick="WeatherWidget.removeLocation(\'' + location.id + '\')">×</button>' +
            '</div>';
        }).join('');
    },

    removeLocation: function(locationId) {
        var self = this;
        Utils.apiRequest('/api/weather/locations/' + locationId, 'DELETE')
            .then(function() {
                self.locations = self.locations.filter(function(loc) {
                    return loc.id !== locationId;
                });
                self.renderLocationsList();
            })
            .catch(function(error) {
                console.error('Failed to remove location:', error);
            });
    },

    refresh: function() {
        this.loadWeatherData();
    },

    cleanup: function() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }
};

if (typeof WidgetManager !== 'undefined') {
    WidgetManager.registerWidget(WeatherWidget);
}