var Admin = {
    calendars: [],
    config: {},
    
    init: function() {
        this.setupEventListeners();
        this.loadCalendars();
        this.loadConfig();
        this.checkSonosStatus();
        this.loadWeatherLocations();
        this.updateSystemStatus();
    },
    
    setupEventListeners: function() {
        var addCalendar = document.getElementById('addCalendar');
        if (addCalendar) {
            addCalendar.addEventListener('click', this.addCalendar.bind(this));
        }
        
        var refreshSonosDevices = document.getElementById('refreshSonosDevices');
        if (refreshSonosDevices) {
            refreshSonosDevices.addEventListener('click', this.refreshSonosDevices.bind(this));
        }
        
        var testSonosConnection = document.getElementById('testSonosConnection');
        if (testSonosConnection) {
            testSonosConnection.addEventListener('click', this.testSonosConnection.bind(this));
        }
        
        var saveSettings = document.getElementById('saveSettings');
        if (saveSettings) {
            saveSettings.addEventListener('click', this.saveSettings.bind(this));
        }
        
        var exportConfig = document.getElementById('exportConfig');
        if (exportConfig) {
            exportConfig.addEventListener('click', this.exportConfig.bind(this));
        }
        
        var importConfig = document.getElementById('importConfig');
        if (importConfig) {
            importConfig.addEventListener('click', this.importConfig.bind(this));
        }
        
        var configFileInput = document.getElementById('configFileInput');
        if (configFileInput) {
            configFileInput.addEventListener('change', this.handleConfigImport.bind(this));
        }
        
        var successClose = document.getElementById('successClose');
        if (successClose) {
            successClose.addEventListener('click', this.hideSuccess.bind(this));
        }
        
        var errorClose = document.getElementById('errorClose');
        if (errorClose) {
            errorClose.addEventListener('click', this.hideError.bind(this));
        }
        
        var saveCalendarConfig = document.getElementById('saveCalendarConfig');
        if (saveCalendarConfig) {
            saveCalendarConfig.addEventListener('click', this.saveCalendarConfig.bind(this));
        }
        
        // Weather event listeners
        var saveWeatherConfig = document.getElementById('saveWeatherConfig');
        if (saveWeatherConfig) {
            saveWeatherConfig.addEventListener('click', this.saveWeatherConfig.bind(this));
        }
        
        var addWeatherLocation = document.getElementById('addWeatherLocation');
        if (addWeatherLocation) {
            addWeatherLocation.addEventListener('click', this.addWeatherLocation.bind(this));
        }
        
        var getLocationCoords = document.getElementById('getLocationCoords');
        if (getLocationCoords) {
            getLocationCoords.addEventListener('click', this.getLocationCoords.bind(this));
        }
    },
    
    loadCalendars: function() {
        var self = this;
        Utils.apiRequest('/api/calendars')
            .then(function(calendars) {
                self.calendars = calendars;
                self.renderCalendars();
                self.updateSystemStatus();
            })
            .catch(function(error) {
                console.error('Failed to load calendars:', error);
                self.showError('Failed to load calendars');
            });
    },
    
    loadConfig: function() {
        var self = this;
        Utils.apiRequest('/api/config')
            .then(function(config) {
                self.config = config;
                self.populateConfigForm();
            })
            .catch(function(error) {
                console.error('Failed to load config:', error);
                self.showError('Failed to load configuration');
            });
    },
    
    checkSonosStatus: function() {
        var self = this;
        this.loadSonosDevices();
    },
    
    loadSonosDevices: function() {
        var self = this;
        Utils.apiRequest('/api/sonos/devices')
            .then(function(response) {
                self.updateSonosDevices(response.devices || []);
                self.updateSonosStatus(response.devices && response.devices.length > 0);
            })
            .catch(function(error) {
                console.error('Failed to load Sonos devices:', error);
                self.updateSonosStatus(false);
                self.updateSonosDevices([]);
            });
    },
    
    addCalendar: function() {
        var name = document.getElementById('calendarName').value.trim();
        var url = document.getElementById('calendarUrl').value.trim();
        var interval = document.getElementById('calendarInterval').value;
        
        if (!name || !url) {
            this.showError('Please enter both calendar name and URL');
            return;
        }
        
        var calendarData = {
            name: name,
            url: url,
            refreshInterval: parseInt(interval)
        };
        
        var self = this;
        Utils.apiRequest('/api/calendars', {
            method: 'POST',
            body: calendarData
        })
        .then(function(calendar) {
            self.calendars.push(calendar);
            self.renderCalendars();
            self.clearCalendarForm();
            self.showSuccess('Calendar added successfully');
            self.updateSystemStatus();
        })
        .catch(function(error) {
            console.error('Failed to add calendar:', error);
            self.showError('Failed to add calendar');
        });
    },
    
    removeCalendar: function(calendarId) {
        var self = this;
        Utils.apiRequest('/api/calendars/' + calendarId, {
            method: 'DELETE'
        })
        .then(function() {
            self.calendars = self.calendars.filter(function(cal) {
                return cal.id !== calendarId;
            });
            self.renderCalendars();
            self.showSuccess('Calendar removed successfully');
            self.updateSystemStatus();
        })
        .catch(function(error) {
            console.error('Failed to remove calendar:', error);
            self.showError('Failed to remove calendar');
        });
    },
    
    renderCalendars: function() {
        var calendarList = document.getElementById('calendarList');
        if (!calendarList) return;
        
        if (this.calendars.length === 0) {
            calendarList.innerHTML = '<div class="loading">No calendars configured</div>';
            return;
        }
        
        var html = '';
        var self = this;
        
        this.calendars.forEach(function(calendar) {
            html += '<div class="calendar-item">' +
                   '<div class="calendar-info">' +
                   '<h4>' + calendar.name + '</h4>' +
                   '<p>' + calendar.url + '</p>' +
                   '<p>Refreshes every ' + (calendar.refreshInterval / 60000) + ' minutes</p>' +
                   '</div>' +
                   '<div class="calendar-actions">' +
                   '<button class="btn btn-danger" onclick="Admin.removeCalendar(\'' + calendar.id + '\')">Remove</button>' +
                   '</div>' +
                   '</div>';
        });
        
        calendarList.innerHTML = html;
    },
    
    clearCalendarForm: function() {
        document.getElementById('calendarName').value = '';
        document.getElementById('calendarUrl').value = '';
        document.getElementById('calendarInterval').value = '300000';
    },
    
    refreshSonosDevices: function() {
        var self = this;
        
        // Show loading state
        var sonosDevices = document.getElementById('sonosDevices');
        if (sonosDevices) {
            sonosDevices.innerHTML = '<div class="loading">Refreshing devices...</div>';
        }
        
        Utils.apiRequest('/api/sonos/devices/refresh', {
            method: 'POST'
        })
        .then(function(response) {
            self.updateSonosDevices(response.devices || []);
            self.updateSonosStatus(response.devices && response.devices.length > 0);
            self.showSuccess('Device list refreshed successfully');
        })
        .catch(function(error) {
            console.error('Failed to refresh Sonos devices:', error);
            self.showError('Failed to refresh device list');
            self.updateSonosDevices([]);
        });
    },
    
    testSonosConnection: function() {
        var self = this;
        
        // Get first available device for testing
        Utils.apiRequest('/api/sonos/devices')
            .then(function(response) {
                var devices = response.devices || [];
                if (devices.length === 0) {
                    self.showError('No Sonos devices found. Please refresh the device list.');
                    return;
                }
                
                var firstDevice = devices[0];
                return Utils.apiRequest('/api/sonos/devices/' + firstDevice.uuid + '/state');
            })
            .then(function(state) {
                if (state) {
                    var status = state.state || 'unknown';
                    var trackInfo = state.track ? state.track.title + ' by ' + state.track.artist : 'No track info';
                    self.showSuccess('Connection successful! Status: ' + status + '. ' + trackInfo);
                } else {
                    self.showError('Device found but no playback information available');
                }
            })
            .catch(function(error) {
                console.error('Sonos connection test failed:', error);
                self.showError('Connection test failed: ' + error.message);
            });
    },
    
    saveSettings: function() {
        var theme = document.getElementById('theme').value;
        var globalRefresh = document.getElementById('globalRefresh').value;
        var showDebugInfo = document.getElementById('showDebugInfo').checked;
        
        var settings = {
            theme: theme,
            refreshInterval: parseInt(globalRefresh),
            showDebugInfo: showDebugInfo
        };
        
        var self = this;
        Utils.apiRequest('/api/config', {
            method: 'POST',
            body: settings
        })
        .then(function() {
            self.config = settings;
            self.showSuccess('Settings saved successfully');
        })
        .catch(function(error) {
            console.error('Failed to save settings:', error);
            self.showError('Failed to save settings');
        });
    },
    
    populateConfigForm: function() {
        var theme = document.getElementById('theme');
        var globalRefresh = document.getElementById('globalRefresh');
        var showDebugInfo = document.getElementById('showDebugInfo');
        var redirectUri = document.getElementById('sonosRedirectUri');
        
        if (theme && this.config.theme) {
            theme.value = this.config.theme;
        }
        
        if (globalRefresh && this.config.refreshInterval) {
            globalRefresh.value = this.config.refreshInterval.toString();
        }
        
        if (showDebugInfo) {
            showDebugInfo.checked = !!this.config.showDebugInfo;
        }
        
        if (redirectUri) {
            redirectUri.value = window.location.protocol + '//' + window.location.host + '/api/sonos/callback';
        }
        
        // Populate calendar configuration
        this.populateCalendarConfig();
        
        // Populate weather configuration
        this.populateWeatherConfig();
    },
    
    populateCalendarConfig: function() {
        var pastWeeks = document.getElementById('pastWeeks');
        var futureMonths = document.getElementById('futureMonths');
        
        if (pastWeeks && this.config.calendar && this.config.calendar.pastWeeks) {
            pastWeeks.value = this.config.calendar.pastWeeks.toString();
        }
        
        if (futureMonths && this.config.calendar && this.config.calendar.futureMonths) {
            futureMonths.value = this.config.calendar.futureMonths.toString();
        }
    },
    
    populateWeatherConfig: function() {
        var weatherRefreshInterval = document.getElementById('weatherRefreshInterval');
        
        if (weatherRefreshInterval && this.config.weather && this.config.weather.refreshInterval) {
            weatherRefreshInterval.value = this.config.weather.refreshInterval.toString();
        }
    },
    
    saveCalendarConfig: function() {
        var pastWeeks = parseInt(document.getElementById('pastWeeks').value);
        var futureMonths = parseInt(document.getElementById('futureMonths').value);
        
        var calendarConfig = {
            pastWeeks: pastWeeks,
            futureMonths: futureMonths
        };
        
        // Update the main config with calendar settings
        var updatedConfig = Object.assign({}, this.config, {
            calendar: calendarConfig
        });
        
        var self = this;
        Utils.apiRequest('/api/config', {
            method: 'POST',
            body: updatedConfig
        })
        .then(function() {
            self.config = updatedConfig;
            self.showSuccess('Calendar configuration saved successfully');
            
            // Trigger calendar widget to reload its configuration
            if (typeof CalendarWidget !== 'undefined' && CalendarWidget.reloadConfig) {
                CalendarWidget.reloadConfig();
            }
        })
        .catch(function(error) {
            console.error('Failed to save calendar config:', error);
            self.showError('Failed to save calendar configuration');
        });
    },
    
    updateSonosStatus: function(hasDevices) {
        var sonosStatus = document.getElementById('sonosStatus');
        var sonosStatusValue = document.getElementById('sonosStatusValue');
        
        if (sonosStatus) {
            if (hasDevices) {
                sonosStatus.innerHTML = '<div class="status-value online">✅ Sonos devices found on network</div>';
            } else {
                sonosStatus.innerHTML = '<div class="status-value offline">❌ No Sonos devices detected</div>';
            }
        }
        
        if (sonosStatusValue) {
            sonosStatusValue.textContent = hasDevices ? 'Connected' : 'No Devices';
            sonosStatusValue.className = 'status-value ' + (hasDevices ? 'online' : 'offline');
        }
    },
    
    updateSonosDevices: function(devices) {
        var sonosDevices = document.getElementById('sonosDevices');
        if (!sonosDevices) return;
        
        if (devices.length === 0) {
            sonosDevices.innerHTML = 
                '<div class="no-devices">' +
                '<div class="no-devices-icon">🔍</div>' +
                '<div class="no-devices-message">No Sonos devices found</div>' +
                '<div class="no-devices-hint">Make sure your speakers are powered on and connected to the same network</div>' +
                '</div>';
            return;
        }
        
        var html = '<div class="device-list">';
        devices.forEach(function(device) {
            html += '<div class="device-item">' +
                   '<div class="device-info">' +
                   '<div class="device-name">🔊 ' + device.name + '</div>' +
                   '<div class="device-details">' +
                   '<span class="device-host">' + device.host + ':' + device.port + '</span>' +
                   '<span class="device-uuid">' + device.uuid + '</span>' +
                   '</div>' +
                   '</div>' +
                   '<div class="device-actions">' +
                   '<button class="btn btn-small" onclick="Admin.testDevicePlayback(\'' + device.uuid + '\')">🎵 Test</button>' +
                   '</div>' +
                   '</div>';
        });
        html += '</div>';
        
        sonosDevices.innerHTML = html;
    },
    
    testDevicePlayback: function(uuid) {
        var self = this;
        Utils.apiRequest('/api/sonos/devices/' + uuid + '/state')
            .then(function(state) {
                if (state && state.track) {
                    self.showSuccess('Device is working! Currently playing: ' + state.track.title + ' by ' + state.track.artist);
                } else {
                    self.showSuccess('Device is working! Status: ' + (state.state || 'ready'));
                }
            })
            .catch(function(error) {
                console.error('Device test failed:', error);
                self.showError('Device test failed: ' + error.message);
            });
    },
    
    updateSystemStatus: function() {
        var activeCalendars = document.getElementById('activeCalendars');
        var lastSystemUpdate = document.getElementById('lastSystemUpdate');
        
        if (activeCalendars) {
            activeCalendars.textContent = this.calendars.length.toString();
        }
        
        if (lastSystemUpdate) {
            var now = new Date();
            lastSystemUpdate.textContent = Utils.formatTime(now);
        }
    },
    
    exportConfig: function() {
        var exportData = {
            calendars: this.calendars,
            config: this.config,
            timestamp: new Date().toISOString()
        };
        
        var dataStr = JSON.stringify(exportData, null, 2);
        var dataBlob = new Blob([dataStr], { type: 'application/json' });
        var url = URL.createObjectURL(dataBlob);
        
        var link = document.createElement('a');
        link.href = url;
        link.download = 'doge-assistant-config.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Configuration exported successfully');
    },
    
    importConfig: function() {
        var fileInput = document.getElementById('configFileInput');
        if (fileInput) {
            fileInput.click();
        }
    },
    
    handleConfigImport: function(event) {
        var file = event.target.files[0];
        if (!file) return;
        
        var reader = new FileReader();
        var self = this;
        
        reader.onload = function(e) {
            try {
                var importedData = JSON.parse(e.target.result);
                
                if (importedData.calendars) {
                    self.calendars = importedData.calendars;
                    self.renderCalendars();
                }
                
                if (importedData.config) {
                    self.config = importedData.config;
                    self.populateConfigForm();
                }
                
                self.showSuccess('Configuration imported successfully');
                self.updateSystemStatus();
            } catch (error) {
                console.error('Failed to import config:', error);
                self.showError('Invalid configuration file');
            }
        };
        
        reader.readAsText(file);
    },
    
    showSuccess: function(message) {
        var successToast = document.getElementById('successToast');
        var successMessage = document.getElementById('successMessage');
        
        if (successToast && successMessage) {
            successMessage.textContent = message;
            successToast.classList.add('show');
            
            setTimeout(function() {
                successToast.classList.remove('show');
            }, 3000);
        }
    },
    
    showError: function(message) {
        var errorToast = document.getElementById('errorToast');
        var errorMessage = document.getElementById('errorMessage');
        
        if (errorToast && errorMessage) {
            errorMessage.textContent = message;
            errorToast.classList.add('show');
            
            setTimeout(function() {
                errorToast.classList.remove('show');
            }, 5000);
        }
    },
    
    hideSuccess: function() {
        var successToast = document.getElementById('successToast');
        if (successToast) {
            successToast.classList.remove('show');
        }
    },
    
    hideError: function() {
        var errorToast = document.getElementById('errorToast');
        if (errorToast) {
            errorToast.classList.remove('show');
        }
    },
    
    // Weather management functions
    loadWeatherLocations: function() {
        var self = this;
        Utils.apiRequest('/api/weather/locations')
            .then(function(locations) {
                self.renderWeatherLocations(locations);
                self.updateWeatherLocationSelect(locations);
            })
            .catch(function(error) {
                console.error('Failed to load weather locations:', error);
                self.showError('Failed to load weather locations');
            });
    },
    
    renderWeatherLocations: function(locations) {
        var locationsList = document.getElementById('weatherLocationsList');
        if (!locationsList) return;
        
        if (!locations || locations.length === 0) {
            locationsList.innerHTML = '<div class="no-locations">No saved locations</div>';
            return;
        }
        
        locationsList.innerHTML = locations.map(function(location) {
            return '<div class="location-item">' +
                '<div class="location-info">' +
                '<strong>' + Utils.escapeHtml(location.name) + '</strong><br>' +
                '<small>' + Utils.escapeHtml(location.country) + ' (' + location.latitude + ', ' + location.longitude + ')</small>' +
                '</div>' +
                '<button class="btn btn-danger btn-sm" onclick="Admin.deleteWeatherLocation(\'' + location.id + '\')">' +
                'Delete' +
                '</button>' +
                '</div>';
        }).join('');
    },
    
    updateWeatherLocationSelect: function(locations) {
        var select = document.getElementById('weatherDefaultLocation');
        if (!select) return;
        
        // Keep the auto-detect option
        select.innerHTML = '<option value="auto">Auto-detect (IP-based)</option>';
        
        if (locations && locations.length > 0) {
            locations.forEach(function(location) {
                var option = document.createElement('option');
                option.value = location.id;
                option.textContent = location.name;
                select.appendChild(option);
            });
        }
        
        // Set current default location
        if (this.config.weather && this.config.weather.defaultLocation) {
            select.value = this.config.weather.defaultLocation;
        }
    },
    
    addWeatherLocation: function() {
        var name = document.getElementById('weatherLocationName').value.trim();
        var city = document.getElementById('weatherLocationCity').value.trim();
        var lat = parseFloat(document.getElementById('weatherLocationLat').value);
        var lon = parseFloat(document.getElementById('weatherLocationLon').value);
        
        if (!name || !city || isNaN(lat) || isNaN(lon)) {
            this.showError('Please fill in all location fields with valid data');
            return;
        }
        
        var locationData = {
            name: name,
            latitude: lat,
            longitude: lon,
            country: city,
            timezone: ''
        };
        
        var self = this;
        Utils.apiRequest('/api/weather/locations', 'POST', locationData)
            .then(function(response) {
                self.showSuccess('Weather location added successfully');
                self.loadWeatherLocations();
                // Clear form
                document.getElementById('weatherLocationName').value = '';
                document.getElementById('weatherLocationCity').value = '';
                document.getElementById('weatherLocationLat').value = '';
                document.getElementById('weatherLocationLon').value = '';
            })
            .catch(function(error) {
                self.showError('Failed to add weather location');
            });
    },
    
    deleteWeatherLocation: function(locationId) {
        if (!confirm('Are you sure you want to delete this weather location?')) {
            return;
        }
        
        var self = this;
        Utils.apiRequest('/api/weather/locations/' + locationId, 'DELETE')
            .then(function() {
                self.showSuccess('Weather location deleted');
                self.loadWeatherLocations();
            })
            .catch(function(error) {
                self.showError('Failed to delete weather location');
            });
    },
    
    getLocationCoords: function() {
        var city = document.getElementById('weatherLocationCity').value.trim();
        if (!city) {
            this.showError('Please enter a city name first');
            return;
        }
        
        this.showSuccess('This feature will be available in a future update. For now, please use a service like latlong.net to find coordinates.');
    },
    
    saveWeatherConfig: function() {
        var defaultLocation = document.getElementById('weatherDefaultLocation').value;
        var refreshInterval = parseInt(document.getElementById('weatherRefreshInterval').value);
        
        if (!defaultLocation || isNaN(refreshInterval)) {
            this.showError('Please select valid weather configuration options');
            return;
        }
        
        var weatherConfig = {
            defaultLocation: defaultLocation,
            refreshInterval: refreshInterval
        };
        
        var configUpdate = Object.assign({}, this.config);
        configUpdate.weather = Object.assign(configUpdate.weather || {}, weatherConfig);
        
        var self = this;
        Utils.apiRequest('/api/config', 'POST', configUpdate)
            .then(function() {
                self.config = configUpdate;
                self.showSuccess('Weather configuration saved');
            })
            .catch(function(error) {
                self.showError('Failed to save weather configuration');
            });
    }
};

document.addEventListener('DOMContentLoaded', function() {
    Admin.init();
});