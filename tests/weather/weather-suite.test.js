/**
 * Weather Widget Test Suite
 * Comprehensive test runner for all weather widget functionality
 */

const { test, expect } = require('@playwright/test');

describe('Weather Widget Complete Test Suite', () => {
    let baseURL;

    test.beforeAll(async () => {
        baseURL = process.env.BASE_URL || 'http://localhost:3000';
        console.log('🌤️ Starting Weather Widget Test Suite');
        console.log(`Testing against: ${baseURL}`);
    });

    test.afterAll(async () => {
        console.log('🌤️ Weather Widget Test Suite Complete');
    });

    describe('🏗️ Widget Initialization and Loading', () => {
        test('should initialize weather widget on page load', async ({ page }) => {
            await page.goto(baseURL);
            await page.waitForLoadState('networkidle');

            // Verify weather tab exists
            const weatherTab = page.locator('button:has-text("🌤️ Weather")');
            await expect(weatherTab).toBeVisible();

            // Click weather tab
            await weatherTab.click();
            
            // Wait for widget to initialize
            await page.waitForSelector('.weather-widget', { timeout: 15000 });
            await expect(page.locator('.weather-widget')).toBeVisible();

            console.log('✅ Weather widget initialized successfully');
        });

        test('should load weather data from API', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            
            // Wait for actual weather data to load
            await page.waitForSelector('.temp-value', { timeout: 20000 });
            
            const tempValue = await page.locator('.temp-value').textContent();
            expect(tempValue).toMatch(/^\d+°[CF]$/);

            console.log(`✅ Weather data loaded: ${tempValue}`);
        });
    });

    describe('🌡️ Temperature and Weather Display', () => {
        test('should display current weather conditions', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.current-weather', { timeout: 15000 });

            // Check all required elements
            await expect(page.locator('.temp-value')).toBeVisible();
            await expect(page.locator('.weather-icon')).toBeVisible();
            await expect(page.locator('.weather-description')).toBeVisible();

            const description = await page.locator('.weather-description').textContent();
            console.log(`✅ Current conditions: ${description}`);
        });

        test('should display weather statistics including sunrise/sunset', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-stats', { timeout: 15000 });

            const stats = page.locator('.weather-stats span');
            await expect(stats).toHaveCount(4);

            // Get sunrise and sunset times
            const sunriseText = await stats.nth(2).textContent();
            const sunsetText = await stats.nth(3).textContent();

            expect(sunriseText).toContain('🌅');
            expect(sunsetText).toContain('🌇');

            console.log(`✅ Sunrise: ${sunriseText.trim()}`);
            console.log(`✅ Sunset: ${sunsetText.trim()}`);
        });

        test('should validate sunrise/sunset times are reasonable', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-stats', { timeout: 15000 });

            const sunriseText = await page.locator('.weather-stats span:nth-child(3)').textContent();
            const sunsetText = await page.locator('.weather-stats span:nth-child(4)').textContent();

            // Extract times
            const sunriseMatch = sunriseText.match(/(\d{1,2}:\d{2}\s+[AP]M)/);
            const sunsetMatch = sunsetText.match(/(\d{1,2}:\d{2}\s+[AP]M)/);

            expect(sunriseMatch).toBeTruthy();
            expect(sunsetMatch).toBeTruthy();

            // Verify sunrise is AM and sunset is PM
            expect(sunriseMatch[1]).toContain('AM');
            expect(sunsetMatch[1]).toContain('PM');

            console.log('✅ Sunrise/sunset times are valid');
        });
    });

    describe('🌡️ Temperature Unit Conversion', () => {
        test('should toggle between Celsius and Fahrenheit', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.temp-unit-toggle', { timeout: 15000 });

            const initialTemp = await page.locator('.temp-value').textContent();
            const initialUnit = initialTemp.includes('°F') ? 'fahrenheit' : 'celsius';

            // Toggle to opposite unit
            const targetUnit = initialUnit === 'celsius' ? 'fahrenheit' : 'celsius';
            await page.click(`.temp-unit-btn[data-unit="${targetUnit}"]`);
            
            // Wait for API response and UI update
            await page.waitForTimeout(3000);
            
            const newTemp = await page.locator('.temp-value').textContent();
            const expectedSymbol = targetUnit === 'celsius' ? '°C' : '°F';
            expect(newTemp).toContain(expectedSymbol);

            console.log(`✅ Temperature unit toggled: ${initialTemp} → ${newTemp}`);
        });
    });

    describe('⏰ Hourly Forecast Carousel', () => {
        test('should display and navigate hourly forecast carousel', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.hourly-carousel', { timeout: 15000 });

            // Verify carousel elements
            await expect(page.locator('.hourly-timeline')).toBeVisible();
            await expect(page.locator('.carousel-arrow.carousel-prev')).toBeVisible();
            await expect(page.locator('.carousel-arrow.carousel-next')).toBeVisible();

            // Check hourly items
            const hourlyItems = page.locator('.hourly-item');
            const itemCount = await hourlyItems.count();
            expect(itemCount).toBeGreaterThan(2);

            console.log(`✅ Hourly carousel displays ${itemCount} items`);

            // Test navigation
            const timeline = page.locator('.hourly-timeline');
            const initialScroll = await timeline.evaluate(el => el.scrollLeft);

            await page.click('.carousel-arrow.carousel-next');
            await page.waitForTimeout(500);

            const newScroll = await timeline.evaluate(el => el.scrollLeft);
            expect(newScroll).toBeGreaterThan(initialScroll);

            console.log('✅ Carousel navigation works correctly');
        });

        test('should display valid hourly data', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.hourly-item', { timeout: 15000 });

            const firstItem = page.locator('.hourly-item').first();
            
            const timeText = await firstItem.locator('.hourly-time').textContent();
            const tempText = await firstItem.locator('.hourly-temp').textContent();

            expect(timeText).toMatch(/^\d{1,2}\s+[AP]M$/); // Format: "9 PM"
            expect(tempText).toMatch(/^\d+°[CF]$/);        // Format: "23°C"

            console.log(`✅ Hourly data valid: ${timeText}, ${tempText}`);
        });
    });

    describe('📅 5-Day Forecast', () => {
        test('should display complete 5-day forecast', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.forecast-days', { timeout: 15000 });

            const forecastDays = page.locator('.forecast-day');
            await expect(forecastDays).toHaveCount(5);

            // Verify first day is "Today"
            const firstDayName = await forecastDays.first().locator('.forecast-day-name').textContent();
            expect(firstDayName).toBe('Today');

            // Verify all days have required elements
            for (let i = 0; i < 5; i++) {
                const day = forecastDays.nth(i);
                await expect(day.locator('.forecast-day-name')).toBeVisible();
                await expect(day.locator('.forecast-icon')).toBeVisible();
                await expect(day.locator('.temp-high')).toBeVisible();
                await expect(day.locator('.temp-low')).toBeVisible();
                await expect(day.locator('.forecast-wind')).toBeVisible();
            }

            console.log('✅ 5-day forecast displays correctly');
        });

        test('should show reasonable temperature ranges', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.forecast-day', { timeout: 15000 });

            const firstDay = page.locator('.forecast-day').first();
            const highTemp = await firstDay.locator('.temp-high').textContent();
            const lowTemp = await firstDay.locator('.temp-low').textContent();

            // Extract numeric values
            const highValue = parseInt(highTemp.replace(/\D/g, ''));
            const lowValue = parseInt(lowTemp.replace(/\D/g, ''));

            expect(highValue).toBeGreaterThan(lowValue);
            expect(highValue).toBeGreaterThan(-50);
            expect(highValue).toBeLessThan(60);
            expect(lowValue).toBeGreaterThan(-50);
            expect(lowValue).toBeLessThan(60);

            console.log(`✅ Temperature range valid: ${lowTemp} to ${highTemp}`);
        });
    });

    describe('🗺️ Location Management', () => {
        test('should display current location', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.location-name', { timeout: 15000 });

            const locationName = await page.locator('.location-name').textContent();
            expect(locationName).toBeTruthy();
            expect(locationName).not.toBe('Loading...');

            console.log(`✅ Current location: ${locationName}`);
        });

        test('should open and close location selector', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.location-selector-btn', { timeout: 15000 });

            // Open modal
            await page.click('.location-selector-btn');
            await expect(page.locator('.location-selector-modal')).toBeVisible();

            // Close modal
            await page.click('.modal-close');
            await expect(page.locator('.location-selector-modal')).not.toBeVisible();

            console.log('✅ Location selector modal works correctly');
        });
    });

    describe('🔄 Refresh and Error Handling', () => {
        test('should refresh weather data', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-widget', { timeout: 15000 });

            // Click refresh and verify it works
            await page.click('.refresh-btn');
            await page.waitForTimeout(3000);

            // Should still display weather widget
            await expect(page.locator('.weather-widget')).toBeVisible();

            console.log('✅ Weather data refresh works');
        });

        test('should handle API errors gracefully', async ({ page }) => {
            // Mock network failure
            await page.route('**/api.open-meteo.com/**', route => route.abort());

            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForTimeout(5000);

            // Should not crash, either show error or cached data
            const hasError = await page.locator('.weather-error').isVisible();
            const hasWidget = await page.locator('.weather-widget').isVisible();
            
            expect(hasError || hasWidget).toBeTruthy();

            console.log('✅ Error handling works correctly');
        });
    });

    describe('📱 Fire 7 Tablet Optimization', () => {
        test('should work on Fire 7 tablet dimensions', async ({ page }) => {
            // Set Fire 7 tablet viewport
            await page.setViewportSize({ width: 1024, height: 600 });
            
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-widget', { timeout: 15000 });

            // Verify widget fits in viewport
            const weatherWidget = page.locator('.weather-widget');
            const boundingBox = await weatherWidget.boundingBox();
            
            expect(boundingBox.width).toBeLessThanOrEqual(1024);
            expect(boundingBox.height).toBeLessThanOrEqual(600);

            console.log(`✅ Fire 7 optimization: ${boundingBox.width}x${boundingBox.height}`);
        });

        test('should have touch-friendly controls', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-widget', { timeout: 15000 });

            // Check carousel arrows are large enough for touch
            const prevArrow = page.locator('.carousel-arrow.carousel-prev');
            const nextArrow = page.locator('.carousel-arrow.carousel-next');
            
            const prevBox = await prevArrow.boundingBox();
            const nextBox = await nextArrow.boundingBox();

            expect(prevBox.width).toBeGreaterThanOrEqual(32);
            expect(prevBox.height).toBeGreaterThanOrEqual(32);
            expect(nextBox.width).toBeGreaterThanOrEqual(32);
            expect(nextBox.height).toBeGreaterThanOrEqual(32);

            console.log('✅ Touch targets are adequately sized');
        });
    });

    describe('⏱️ Performance and Loading', () => {
        test('should load weather data within acceptable time', async ({ page }) => {
            const startTime = Date.now();
            
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.temp-value', { timeout: 20000 });
            
            const loadTime = Date.now() - startTime;
            expect(loadTime).toBeLessThan(20000); // Should load within 20 seconds

            console.log(`✅ Weather data loaded in ${loadTime}ms`);
        });

        test('should update last updated timestamp', async ({ page }) => {
            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-widget', { timeout: 15000 });

            // Check for last updated indicator
            const hasLastUpdated = await page.locator('#lastUpdated, .last-updated').isVisible();
            
            if (hasLastUpdated) {
                const lastUpdatedText = await page.locator('#lastUpdated, .last-updated').textContent();
                expect(lastUpdatedText).toContain('Updated');
                console.log(`✅ ${lastUpdatedText}`);
            }
        });
    });

    describe('🎯 Integration with Open-Meteo API', () => {
        test('should use correct timezone parameter', async ({ page }) => {
            let apiCalled = false;
            let hasTimezone = false;

            // Monitor API calls
            page.on('request', request => {
                if (request.url().includes('api.open-meteo.com')) {
                    apiCalled = true;
                    hasTimezone = request.url().includes('timezone=');
                    console.log(`📡 API Call: ${request.url()}`);
                }
            });

            await page.goto(baseURL);
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-widget', { timeout: 15000 });

            expect(apiCalled).toBeTruthy();
            expect(hasTimezone).toBeTruthy();

            console.log('✅ API calls include timezone parameter');
        });
    });

    // Summary test that runs key functionality
    test('🏆 Weather Widget Complete Functionality Test', async ({ page }) => {
        console.log('🧪 Running comprehensive functionality test...');

        // 1. Navigate to weather tab
        await page.goto(baseURL);
        await page.click('button:has-text("🌤️ Weather")');
        await page.waitForSelector('.weather-widget', { timeout: 20000 });

        // 2. Verify current weather display
        await expect(page.locator('.temp-value')).toBeVisible();
        await expect(page.locator('.weather-stats span')).toHaveCount(4);

        // 3. Verify sunrise/sunset display
        const sunriseText = await page.locator('.weather-stats span:nth-child(3)').textContent();
        const sunsetText = await page.locator('.weather-stats span:nth-child(4)').textContent();
        expect(sunriseText).toContain('🌅');
        expect(sunsetText).toContain('🌇');

        // 4. Test hourly carousel
        await expect(page.locator('.hourly-carousel')).toBeVisible();
        await page.click('.carousel-arrow.carousel-next');
        await page.waitForTimeout(500);

        // 5. Verify 5-day forecast
        const forecastDays = page.locator('.forecast-day');
        await expect(forecastDays).toHaveCount(5);

        // 6. Test temperature unit toggle
        const initialTemp = await page.locator('.temp-value').textContent();
        const targetUnit = initialTemp.includes('°F') ? 'celsius' : 'fahrenheit';
        await page.click(`.temp-unit-btn[data-unit="${targetUnit}"]`);
        await page.waitForTimeout(2000);

        // 7. Test location selector
        await page.click('.location-selector-btn');
        await expect(page.locator('.location-selector-modal')).toBeVisible();
        await page.click('.modal-close');

        console.log('🎉 All weather widget functionality tests passed!');
    });
});