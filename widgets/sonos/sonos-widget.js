var SonosWidget = {
    name: 'Sonos',
    icon: '🔊',
    devices: [],
    selectedDevice: null,
    playerState: null,
    
    init: function() {
        this.refresh();
    },
    
    render: function() {
        return '<div class="sonos-widget">' +
               '<div class="player-info">' +
               '<div class="player-name">Discovering Sonos devices...</div>' +
               '</div>' +
               '</div>';
    },
    
    loadSelectedDevice: function() {
        var deviceUuid = localStorage.getItem('sonos_selected_device');
        if (deviceUuid && this.devices.length > 0) {
            this.selectedDevice = this.devices.find(function(device) {
                return device.uuid === deviceUuid;
            });
        }
        
        // Auto-select first device if none selected
        if (!this.selectedDevice && this.devices.length > 0) {
            this.selectedDevice = this.devices[0];
            localStorage.setItem('sonos_selected_device', this.selectedDevice.uuid);
        }
    },
    
    refresh: function() {
        WidgetManager.updateWidgetStatus('Sonos', 'Loading');
        
        return this.discoverDevices()
            .then(this.loadSelectedDevice.bind(this))
            .then(this.getPlayerState.bind(this))
            .then(this.renderPlayerInterface.bind(this))
            .then(function() {
                WidgetManager.updateWidgetStatus('Sonos', 'Online');
            }.bind(this))
            .catch(this.handleError.bind(this));
    },
    
    discoverDevices: function() {
        return fetch('/api/sonos/devices')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to discover devices: HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                this.devices = data.devices || [];
                if (this.devices.length === 0) {
                    throw new Error('No Sonos devices found on network');
                }
                return this.devices;
            }.bind(this));
    },
    
    getPlayerState: function() {
        if (!this.selectedDevice) {
            return Promise.resolve(null);
        }
        
        return fetch('/api/sonos/devices/' + this.selectedDevice.uuid + '/state')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to get player state: HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(state) {
                this.playerState = state;
                return state;
            }.bind(this));
    },
    
    sendCommand: function(action, data) {
        if (!this.selectedDevice) {
            return Promise.reject(new Error('No device selected'));
        }
        
        var url = '/api/sonos/devices/' + this.selectedDevice.uuid + '/' + action;
        var options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        return fetch(url, options)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Command failed: HTTP ' + response.status);
                }
                return response.json();
            });
    },
    
    sendPlaybackCommand: function(action, data) {
        return this.sendCommand(action, data)
            .then(function() {
                // Refresh state after command
                setTimeout(this.getPlayerState.bind(this), 500);
                setTimeout(this.renderPlayerInterface.bind(this), 600);
            }.bind(this))
            .catch(function(error) {
                console.error('Playback command failed:', error);
                Utils.showError('Playback command failed: ' + error.message);
            });
    },
    
    renderPlayerInterface: function() {
        if (!this.selectedDevice) {
            this.showNotConnected();
            return;
        }
        
        var html = '<div class="player-info">' +
                  '<div class="player-name">' + this.selectedDevice.name + '</div>';
        
        // Device selector if multiple devices
        if (this.devices.length > 1) {
            html += '<select class="device-selector" onchange="SonosWidget.switchDevice(this.value)">';
            this.devices.forEach(function(device) {
                var selected = device.uuid === this.selectedDevice.uuid ? ' selected' : '';
                html += '<option value="' + device.uuid + '"' + selected + '>' + device.name + '</option>';
            }.bind(this));
            html += '</select>';
        }
        
        html += '</div>';
        
        // Show track info if available
        if (this.playerState && this.playerState.track) {
            var track = this.playerState.track;
            html += '<div class="now-playing">' +
                   '<div class="track-title">' + track.title + '</div>' +
                   '<div class="track-artist">' + track.artist + '</div>';
            if (track.album) {
                html += '<div class="track-album">' + track.album + '</div>';
            }
            html += '</div>';
        }
        
        // Control buttons
        var isPlaying = this.playerState && this.playerState.state === 'playing';
        html += '<div class="controls">' +
               '<button class="control-btn" onclick="SonosWidget.previousTrack()">⏮️</button>' +
               '<button class="control-btn play-pause" onclick="SonosWidget.togglePlayPause()">' +
               (isPlaying ? '⏸️' : '▶️') +
               '</button>' +
               '<button class="control-btn" onclick="SonosWidget.nextTrack()">⏭️</button>' +
               '</div>';
        
        // Volume control
        var volume = this.playerState ? this.playerState.volume || 50 : 50;
        html += '<div class="volume-control">' +
               '<button class="volume-btn" onclick="SonosWidget.adjustVolume(-10)">🔉</button>' +
               '<input type="range" class="volume-slider" min="0" max="100" value="' + volume + '" ' +
               'onchange="SonosWidget.setVolume(this.value)" oninput="SonosWidget.updateVolumeDisplay(this.value)">' +
               '<button class="volume-btn" onclick="SonosWidget.adjustVolume(10)">🔊</button>' +
               '<span class="volume-value" id="volumeValue">' + volume + '</span>' +
               '</div>';
        
        WidgetManager.updateWidgetContent('Sonos', html);
    },
    
    showNotConnected: function() {
        var html = '<div class="widget-error">' +
                  '<div class="error-icon">🔍</div>' +
                  '<div class="error-message">No Sonos Devices Found</div>' +
                  '<div class="error-details">Make sure Sonos speakers are on the same network</div>' +
                  '<button class="btn btn-primary" onclick="SonosWidget.refresh()">Refresh</button>' +
                  '</div>';
        
        WidgetManager.updateWidgetContent('Sonos', html);
        WidgetManager.updateWidgetStatus('Sonos', 'Offline');
    },
    
    togglePlayPause: function() {
        if (!this.selectedDevice) return;
        
        var isPlaying = this.playerState && this.playerState.state === 'playing';
        this.sendPlaybackCommand(isPlaying ? 'pause' : 'play');
    },
    
    nextTrack: function() {
        this.sendPlaybackCommand('next');
    },
    
    previousTrack: function() {
        this.sendPlaybackCommand('previous');
    },
    
    setVolume: function(volume) {
        this.sendPlaybackCommand('volume', { volume: parseInt(volume) });
    },
    
    adjustVolume: function(delta) {
        if (!this.playerState) return;
        
        var currentVolume = this.playerState.volume || 50;
        var newVolume = Math.max(0, Math.min(100, currentVolume + delta));
        this.setVolume(newVolume);
    },
    
    updateVolumeDisplay: function(volume) {
        var volumeValue = document.getElementById('volumeValue');
        if (volumeValue) {
            volumeValue.textContent = volume;
        }
    },
    
    switchDevice: function(uuid) {
        this.selectedDevice = this.devices.find(function(device) {
            return device.uuid === uuid;
        });
        
        if (this.selectedDevice) {
            localStorage.setItem('sonos_selected_device', uuid);
            this.getPlayerState().then(this.renderPlayerInterface.bind(this));
        }
    },
    
    handleError: function(error) {
        console.error('Sonos widget error:', error);
        
        if (error.message.includes('No Sonos devices found')) {
            this.showNotConnected();
        } else {
            WidgetManager.showWidgetError('Sonos', error);
        }
    }
};

if (typeof WidgetManager !== 'undefined') {
    WidgetManager.registerWidget(SonosWidget);
}