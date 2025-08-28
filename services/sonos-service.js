const { DeviceDiscovery } = require('sonos');

class SonosService {
    constructor() {
        this.devices = new Map();
        this.discovering = false;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('Initializing Sonos service...');
        await this.discoverDevices();
        this.initialized = true;
    }

    async discoverDevices() {
        if (this.discovering) return;
        
        return new Promise((resolve, reject) => {
            this.discovering = true;
            console.log('Discovering Sonos devices on network...');
            
            const discovery = DeviceDiscovery();
            const timeout = setTimeout(() => {
                discovery.destroy();
                this.discovering = false;
                resolve([...this.devices.values()]);
            }, 10000); // 10 second discovery timeout

            discovery.on('DeviceAvailable', async (device) => {
                console.log('Found Sonos device:', device.roomName || 'Loading...');
                
                // Generate UUID from host if not available
                const deviceId = device.uuid || `sonos-${device.host.replace(/\./g, '-')}`;
                
                // Try to get device info
                let deviceName = device.roomName || 'Sonos Speaker';
                try {
                    if (!device.roomName && device.deviceDescription) {
                        const description = await device.deviceDescription();
                        deviceName = description.roomName || description.friendlyName || `Sonos (${device.host})`;
                    }
                } catch (error) {
                    console.log('Could not fetch device details, using default name');
                    deviceName = `Sonos Speaker (${device.host})`;
                }
                
                this.devices.set(deviceId, {
                    uuid: deviceId,
                    name: deviceName,
                    host: device.host,
                    port: device.port,
                    device: device
                });
                
                console.log(`Added Sonos device: ${deviceName} (${device.host})`);
            });

            discovery.on('error', (error) => {
                console.error('Sonos discovery error:', error);
                clearTimeout(timeout);
                this.discovering = false;
                reject(error);
            });
        });
    }

    getDevices() {
        return [...this.devices.values()].map(device => ({
            uuid: device.uuid,
            name: device.name,
            host: device.host,
            port: device.port
        }));
    }

    getDevice(uuid) {
        return this.devices.get(uuid);
    }

    async getPlaybackState(uuid) {
        const deviceInfo = this.devices.get(uuid);
        if (!deviceInfo) {
            throw new Error('Device not found');
        }

        try {
            const device = deviceInfo.device;
            const [currentTrack, playState, volume] = await Promise.all([
                device.currentTrack().catch(() => null),
                device.getCurrentState().catch(() => 'stopped'),
                device.getVolume().catch(() => 50)
            ]);

            return {
                state: playState,
                volume: volume,
                track: currentTrack ? {
                    title: currentTrack.title || 'Unknown Track',
                    artist: currentTrack.artist || 'Unknown Artist',
                    album: currentTrack.album || '',
                    albumArt: currentTrack.albumArtURL || '',
                    duration: currentTrack.duration || '0:00',
                    position: currentTrack.position || '0:00'
                } : null
            };
        } catch (error) {
            console.error('Error getting playback state:', error);
            throw error;
        }
    }

    async play(uuid) {
        const deviceInfo = this.devices.get(uuid);
        if (!deviceInfo) {
            throw new Error('Device not found');
        }

        try {
            await deviceInfo.device.play();
            return { success: true };
        } catch (error) {
            console.error('Error playing:', error);
            throw error;
        }
    }

    async pause(uuid) {
        const deviceInfo = this.devices.get(uuid);
        if (!deviceInfo) {
            throw new Error('Device not found');
        }

        try {
            await deviceInfo.device.pause();
            return { success: true };
        } catch (error) {
            console.error('Error pausing:', error);
            throw error;
        }
    }

    async next(uuid) {
        const deviceInfo = this.devices.get(uuid);
        if (!deviceInfo) {
            throw new Error('Device not found');
        }

        try {
            await deviceInfo.device.next();
            return { success: true };
        } catch (error) {
            console.error('Error skipping to next:', error);
            throw error;
        }
    }

    async previous(uuid) {
        const deviceInfo = this.devices.get(uuid);
        if (!deviceInfo) {
            throw new Error('Device not found');
        }

        try {
            await deviceInfo.device.previous();
            return { success: true };
        } catch (error) {
            console.error('Error skipping to previous:', error);
            throw error;
        }
    }

    async setVolume(uuid, volume) {
        const deviceInfo = this.devices.get(uuid);
        if (!deviceInfo) {
            throw new Error('Device not found');
        }

        try {
            const volumeLevel = Math.max(0, Math.min(100, parseInt(volume)));
            await deviceInfo.device.setVolume(volumeLevel);
            return { success: true, volume: volumeLevel };
        } catch (error) {
            console.error('Error setting volume:', error);
            throw error;
        }
    }

    async mute(uuid) {
        const deviceInfo = this.devices.get(uuid);
        if (!deviceInfo) {
            throw new Error('Device not found');
        }

        try {
            await deviceInfo.device.setMuted(true);
            return { success: true };
        } catch (error) {
            console.error('Error muting:', error);
            throw error;
        }
    }

    async unmute(uuid) {
        const deviceInfo = this.devices.get(uuid);
        if (!deviceInfo) {
            throw new Error('Device not found');
        }

        try {
            await deviceInfo.device.setMuted(false);
            return { success: true };
        } catch (error) {
            console.error('Error unmuting:', error);
            throw error;
        }
    }

    async refreshDevices() {
        console.log('Refreshing Sonos devices...');
        this.devices.clear();
        await this.discoverDevices();
        return this.getDevices();
    }
}

module.exports = new SonosService();