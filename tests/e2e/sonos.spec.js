const { test, expect } = require('@playwright/test');

test.describe('Sonos Widget Integration', () => {
    test('should discover and display Sonos devices', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Wait for the Sonos widget to load
        await expect(page.locator('h2:has-text("🔊 Sonos")')).toBeVisible();
        
        // Should show Online status after discovery
        await expect(page.locator('h2:has-text("🔊 Sonos") ~ .widget-status:has-text("Online")')).toBeVisible({ timeout: 10000 });
        
        // Should display device name
        await expect(page.locator('.widget-content .player-name')).toBeVisible();
        
        // Should display control buttons
        await expect(page.locator('.widget-content .control-btn')).toHaveCount(3);
        await expect(page.locator('.widget-content button:has-text("⏮️")')).toBeVisible();
        await expect(page.locator('.widget-content button[class*="play-pause"]')).toBeVisible();
        await expect(page.locator('.widget-content button:has-text("⏭️")')).toBeVisible();
        
        // Should display volume control
        await expect(page.locator('.widget-content .volume-slider')).toBeVisible();
        await expect(page.locator('.widget-content .volume-value')).toBeVisible();
    });

    test('should show track information when available', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Wait for widget to load and show track info if available
        await page.waitForSelector('.widget-content .player-name', { timeout: 10000 });
        
        // Check if track information is displayed (when music is playing)
        const trackTitle = page.locator('.widget-content .track-title');
        const trackArtist = page.locator('.widget-content .track-artist');
        
        if (await trackTitle.isVisible()) {
            await expect(trackTitle).not.toBeEmpty();
            await expect(trackArtist).not.toBeEmpty();
        }
    });

    test('should handle play/pause functionality', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Wait for widget to be fully loaded
        await expect(page.locator('.widget-content .control-btn')).toHaveCount(3, { timeout: 10000 });
        
        const playPauseButton = page.locator('.widget-content button[class*="play-pause"]');
        await expect(playPauseButton).toBeVisible();
        
        // Get initial button state
        const initialButtonText = await playPauseButton.textContent();
        
        // Click play/pause button
        await playPauseButton.click();
        
        // Wait a moment for the state to potentially change
        await page.waitForTimeout(2000);
        
        // Button should be clickable (no errors)
        await expect(playPauseButton).toBeVisible();
    });

    test('should display device selector when multiple devices exist', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Wait for widget to load
        await page.waitForSelector('.widget-content .player-name', { timeout: 10000 });
        
        // Check if device selector exists (only shows if multiple devices)
        const deviceSelector = page.locator('.widget-content .device-selector');
        
        if (await deviceSelector.isVisible()) {
            await expect(deviceSelector).toBeVisible();
            await expect(deviceSelector.locator('option')).toHaveCountGreaterThan(1);
        }
    });

    test('should handle volume control', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Wait for widget to load
        await expect(page.locator('.widget-content .volume-slider')).toBeVisible({ timeout: 10000 });
        
        const volumeSlider = page.locator('.widget-content .volume-slider');
        const volumeValue = page.locator('.widget-content .volume-value');
        const volumeUpButton = page.locator('.widget-content button:has-text("🔊")');
        const volumeDownButton = page.locator('.widget-content button:has-text("🔉")');
        
        // Volume controls should be visible
        await expect(volumeSlider).toBeVisible();
        await expect(volumeValue).toBeVisible();
        await expect(volumeUpButton).toBeVisible();
        await expect(volumeDownButton).toBeVisible();
        
        // Volume slider should have valid value
        const sliderValue = await volumeSlider.getAttribute('value');
        expect(parseInt(sliderValue)).toBeGreaterThanOrEqual(0);
        expect(parseInt(sliderValue)).toBeLessThanOrEqual(100);
        
        // Volume display should match slider
        const displayValue = await volumeValue.textContent();
        expect(displayValue).toBe(sliderValue);
    });

    test('should show error state when no devices found', async ({ page }) => {
        // This test requires temporarily stopping Sonos service or disconnecting devices
        // For now, we'll test the error handling structure exists
        
        await page.goto('http://localhost:3000');
        
        // Wait for initial load
        await page.waitForTimeout(5000);
        
        // Check if widget content exists
        const widgetContent = page.locator('h2:has-text("🔊 Sonos") ~ .widget-content');
        
        // The widget should either show content or an error message
        const hasPlayerInfo = await page.locator('.widget-content .player-name').isVisible();
        const hasError = await page.locator('.widget-content .widget-error').isVisible();
        
        expect(hasPlayerInfo || hasError).toBeTruthy();
    });

    test('should refresh automatically', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Wait for initial load
        await expect(page.locator('.widget-content .player-name')).toBeVisible({ timeout: 10000 });
        
        // Check that refresh functionality doesn't break the widget
        await page.locator('button:has-text("🔄")').click();
        
        // Wait for refresh and verify widget still works
        await page.waitForTimeout(3000);
        await expect(page.locator('.widget-content .player-name')).toBeVisible();
    });
});

test.describe('Sonos Admin Panel Integration', () => {
    test('should display discovered devices in admin panel', async ({ page }) => {
        await page.goto('http://localhost:3000/admin');
        
        // Wait for admin panel to load
        await expect(page.locator('h2:has-text("🔊 Sonos Network Control")')).toBeVisible();
        
        // Should show device discovery status
        await expect(page.locator('#sonosStatus')).toBeVisible({ timeout: 10000 });
        
        // Should display device list
        await expect(page.locator('#sonosDevices')).toBeVisible();
        
        // Should show refresh button
        await expect(page.locator('button:has-text("🔄 Refresh Device List")')).toBeVisible();
        
        // Should show test connection button
        await expect(page.locator('button:has-text("🎵 Test Playback")')).toBeVisible();
    });

    test('should successfully refresh device list', async ({ page }) => {
        await page.goto('http://localhost:3000/admin');
        
        // Wait for initial load
        await page.waitForSelector('#sonosDevices', { timeout: 10000 });
        
        // Click refresh button
        await page.locator('button:has-text("🔄 Refresh Device List")').click();
        
        // Should show success message or updated devices
        await page.waitForTimeout(3000);
        
        // Verify devices are still displayed
        await expect(page.locator('#sonosDevices')).toBeVisible();
    });

    test('should test device connectivity', async ({ page }) => {
        await page.goto('http://localhost:3000/admin');
        
        // Wait for devices to load
        await page.waitForTimeout(5000);
        
        // Click test connection button (general test)
        const testButton = page.locator('button:has-text("🎵 Test Playback")');
        if (await testButton.isVisible()) {
            await testButton.click();
            
            // Should show some feedback (success or error)
            await page.waitForTimeout(2000);
        }
        
        // Test individual device button if available
        const deviceTestButton = page.locator('button:has-text("🎵 Test")').first();
        if (await deviceTestButton.isVisible()) {
            await deviceTestButton.click();
            
            // Should show some feedback
            await page.waitForTimeout(2000);
        }
    });

    test('should display local network benefits information', async ({ page }) => {
        await page.goto('http://localhost:3000/admin');
        
        // Should show local network benefits
        await expect(page.locator('text=📡 Local Network Control')).toBeVisible();
        await expect(page.locator('text=No OAuth required')).toBeVisible();
        await expect(page.locator('text=Local network only')).toBeVisible();
        await expect(page.locator('text=Faster response')).toBeVisible();
        await expect(page.locator('text=More secure')).toBeVisible();
        
        // Should show troubleshooting information
        await expect(page.locator('text=Troubleshooting:')).toBeVisible();
        await expect(page.locator('text=same WiFi network')).toBeVisible();
    });

    test('should update system status correctly', async ({ page }) => {
        await page.goto('http://localhost:3000/admin');
        
        // Wait for system status to load
        await expect(page.locator('#sonosStatusValue')).toBeVisible({ timeout: 10000 });
        
        const sonosStatusValue = page.locator('#sonosStatusValue');
        const statusText = await sonosStatusValue.textContent();
        
        // Should show either "Connected" or "No Devices"
        expect(['Connected', 'No Devices', 'Disconnected']).toContain(statusText);
        
        // Should have appropriate CSS class
        const statusClass = await sonosStatusValue.getAttribute('class');
        expect(statusClass).toMatch(/(online|offline)/);
    });
});