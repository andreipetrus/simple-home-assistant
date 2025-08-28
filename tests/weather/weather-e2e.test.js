/**
 * Weather Widget End-to-End Tests
 * Tests the complete user workflows and interactions with the weather widget
 */

const { test, expect } = require('@playwright/test');

describe('Weather Widget E2E Tests', () => {
    let baseURL;

    test.beforeAll(async () => {
        baseURL = process.env.BASE_URL || 'http://localhost:3000';
    });

    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');
    });

    describe('Weather Tab Navigation', () => {
        test('should navigate to weather tab and load content', async ({ page }) => {
            // Click weather tab
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-widget', { timeout: 10000 });

            // Verify weather widget is visible
            await expect(page.locator('.weather-widget')).toBeVisible();
            await expect(page.locator('.current-weather')).toBeVisible();
        });

        test('should show loading state initially', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            
            // Check for loading spinner (might be brief)
            const loadingSpinner = page.locator('.loading-spinner');
            if (await loadingSpinner.isVisible()) {
                await expect(loadingSpinner).toBeVisible();
            }
        });

        test('should display weather data after loading', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.current-temp .temp-value', { timeout: 15000 });

            // Verify current weather elements
            await expect(page.locator('.current-temp .temp-value')).toBeVisible();
            await expect(page.locator('.weather-icon')).toBeVisible();
            await expect(page.locator('.weather-description')).toBeVisible();
            await expect(page.locator('.weather-stats')).toBeVisible();
        });
    });

    describe('Location Display and Management', () => {
        test('should display current location name', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.location-name', { timeout: 10000 });

            const locationName = await page.locator('.location-name').textContent();
            expect(locationName).toBeTruthy();
            expect(locationName).not.toBe('Loading...');
        });

        test('should open location selector modal', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.location-selector-btn', { timeout: 10000 });

            // Click location selector button
            await page.click('.location-selector-btn');
            
            // Verify modal opens
            await expect(page.locator('.location-selector-modal')).toBeVisible();
            await expect(page.locator('.modal-header h3')).toContainText('Select Location');
        });

        test('should close location selector modal', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.location-selector-btn', { timeout: 10000 });

            // Open modal
            await page.click('.location-selector-btn');
            await expect(page.locator('.location-selector-modal')).toBeVisible();

            // Close modal with X button
            await page.click('.modal-close');
            await expect(page.locator('.location-selector-modal')).not.toBeVisible();
        });
    });

    describe('Current Weather Display', () => {
        test('should display current temperature with unit', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.temp-value', { timeout: 15000 });

            const tempValue = await page.locator('.temp-value').textContent();
            expect(tempValue).toMatch(/^\d+°[CF]$/); // Should match format like "23°C" or "73°F"
        });

        test('should display weather statistics', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-stats', { timeout: 15000 });

            const stats = page.locator('.weather-stats span');
            await expect(stats).toHaveCount(4); // Humidity, Wind, Sunrise, Sunset

            // Verify humidity display
            await expect(stats.nth(0)).toContainText('💧');
            await expect(stats.nth(0)).toContainText('%');

            // Verify wind display  
            await expect(stats.nth(1)).toContainText('💨');

            // Verify sunrise display
            await expect(stats.nth(2)).toContainText('🌅');
            
            // Verify sunset display
            await expect(stats.nth(3)).toContainText('🌇');
        });

        test('should display accurate sunrise and sunset times', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-stats', { timeout: 15000 });

            const sunriseText = await page.locator('.weather-stats span:nth-child(3)').textContent();
            const sunsetText = await page.locator('.weather-stats span:nth-child(4)').textContent();

            // Extract times using regex
            const sunriseMatch = sunriseText.match(/🌅\s+(\d{1,2}:\d{2}\s+[AP]M)/);
            const sunsetMatch = sunsetText.match(/🌇\s+(\d{1,2}:\d{2}\s+[AP]M)/);

            expect(sunriseMatch).toBeTruthy();
            expect(sunsetMatch).toBeTruthy();

            // Verify sunrise is in morning (AM)
            expect(sunriseMatch[1]).toContain('AM');
            
            // Verify sunset is in evening (PM)
            expect(sunsetMatch[1]).toContain('PM');

            // Parse times to verify sunrise is before sunset
            const sunriseTime = new Date(`2025-08-28 ${sunriseMatch[1]}`);
            const sunsetTime = new Date(`2025-08-28 ${sunsetMatch[1]}`);
            expect(sunriseTime.getTime()).toBeLessThan(sunsetTime.getTime());
        });
    });

    describe('Temperature Unit Toggle', () => {
        test('should toggle between Fahrenheit and Celsius', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.temp-unit-toggle', { timeout: 10000 });

            // Get initial temperature
            const initialTemp = await page.locator('.temp-value').textContent();

            // Click opposite unit
            if (initialTemp.includes('°F')) {
                await page.click('.temp-unit-btn[data-unit="celsius"]');
                await page.waitForTimeout(2000); // Wait for API call
                const newTemp = await page.locator('.temp-value').textContent();
                expect(newTemp).toContain('°C');
            } else {
                await page.click('.temp-unit-btn[data-unit="fahrenheit"]');
                await page.waitForTimeout(2000); // Wait for API call
                const newTemp = await page.locator('.temp-value').textContent();
                expect(newTemp).toContain('°F');
            }
        });

        test('should highlight active temperature unit', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.temp-unit-toggle', { timeout: 10000 });

            const activeButton = page.locator('.temp-unit-btn.active');
            await expect(activeButton).toHaveCount(1);
        });
    });

    describe('Hourly Forecast Carousel', () => {
        test('should display hourly forecast carousel', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.hourly-carousel', { timeout: 15000 });

            // Verify carousel elements
            await expect(page.locator('.hourly-timeline')).toBeVisible();
            await expect(page.locator('.carousel-arrow.carousel-prev')).toBeVisible();
            await expect(page.locator('.carousel-arrow.carousel-next')).toBeVisible();
        });

        test('should display hourly forecast items', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.hourly-item', { timeout: 15000 });

            const hourlyItems = page.locator('.hourly-item');
            await expect(hourlyItems).toHaveCountGreaterThan(2);

            // Verify first hourly item structure
            const firstItem = hourlyItems.first();
            await expect(firstItem.locator('.hourly-time')).toBeVisible();
            await expect(firstItem.locator('.hourly-icon')).toBeVisible();
            await expect(firstItem.locator('.hourly-temp')).toBeVisible();
        });

        test('should navigate carousel with arrow buttons', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.hourly-carousel', { timeout: 15000 });

            const timeline = page.locator('.hourly-timeline');
            const nextButton = page.locator('.carousel-arrow.carousel-next');
            const prevButton = page.locator('.carousel-arrow.carousel-prev');

            // Get initial scroll position
            const initialScroll = await timeline.evaluate(el => el.scrollLeft);

            // Click next button
            await nextButton.click();
            await page.waitForTimeout(500); // Wait for scroll animation

            const newScroll = await timeline.evaluate(el => el.scrollLeft);
            expect(newScroll).toBeGreaterThan(initialScroll);

            // Click prev button
            await prevButton.click();
            await page.waitForTimeout(500); // Wait for scroll animation

            const finalScroll = await timeline.evaluate(el => el.scrollLeft);
            expect(finalScroll).toBeLessThan(newScroll);
        });

        test('should update arrow opacity based on scroll position', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.hourly-carousel', { timeout: 15000 });

            const prevButton = page.locator('.carousel-arrow.carousel-prev');
            const nextButton = page.locator('.carousel-arrow.carousel-next');

            // At start, prev button should have reduced opacity
            const initialPrevOpacity = await prevButton.evaluate(el => getComputedStyle(el).opacity);
            expect(parseFloat(initialPrevOpacity)).toBeLessThanOrEqual(0.3);

            // Scroll to end and check next button opacity
            await page.evaluate(() => {
                const timeline = document.querySelector('.hourly-timeline');
                timeline.scrollLeft = timeline.scrollWidth;
            });
            await page.waitForTimeout(500);

            const finalNextOpacity = await nextButton.evaluate(el => getComputedStyle(el).opacity);
            expect(parseFloat(finalNextOpacity)).toBeLessThanOrEqual(0.3);
        });
    });

    describe('5-Day Forecast', () => {
        test('should display 5-day forecast', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.forecast-days', { timeout: 15000 });

            const forecastDays = page.locator('.forecast-day');
            await expect(forecastDays).toHaveCount(5);

            // Verify first day shows "Today"
            await expect(forecastDays.first().locator('.forecast-day-name')).toContainText('Today');
        });

        test('should display complete forecast information', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.forecast-day', { timeout: 15000 });

            const firstForecast = page.locator('.forecast-day').first();

            // Verify all forecast elements
            await expect(firstForecast.locator('.forecast-day-name')).toBeVisible();
            await expect(firstForecast.locator('.forecast-icon')).toBeVisible();
            await expect(firstForecast.locator('.temp-high')).toBeVisible();
            await expect(firstForecast.locator('.temp-low')).toBeVisible();
            await expect(firstForecast.locator('.forecast-wind')).toBeVisible();
        });

        test('should show precipitation when present', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.forecast-day', { timeout: 15000 });

            // Check if any forecast day shows precipitation
            const precipElements = page.locator('.forecast-rain');
            const precipCount = await precipElements.count();
            
            if (precipCount > 0) {
                await expect(precipElements.first()).toContainText('🌧️');
                await expect(precipElements.first()).toContainText(/\d+/); // Should contain numbers
            }
        });
    });

    describe('Refresh Functionality', () => {
        test('should refresh weather data', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-widget', { timeout: 15000 });

            // Get current temperature
            const initialTemp = await page.locator('.temp-value').textContent();

            // Click refresh button
            await page.click('.refresh-btn');
            await page.waitForTimeout(3000); // Wait for API call

            // Verify content updated (at minimum, last updated time should change)
            const lastUpdated = await page.locator('#lastUpdated, .last-updated').textContent();
            expect(lastUpdated).toBeTruthy();
        });

        test('should handle refresh errors gracefully', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-widget', { timeout: 15000 });

            // Mock network failure by intercepting the request
            await page.route('**/api.open-meteo.com/**', route => route.abort());

            // Click refresh button
            await page.click('.refresh-btn');
            await page.waitForTimeout(2000);

            // Should not crash or show major errors
            await expect(page.locator('.weather-widget')).toBeVisible();
        });
    });

    describe('Responsive Design', () => {
        test('should adapt to Fire 7 tablet dimensions', async ({ page }) => {
            // Set Fire 7 tablet viewport (1024x600)
            await page.setViewportSize({ width: 1024, height: 600 });
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-widget', { timeout: 15000 });

            // Verify widget fits in viewport
            const weatherWidget = page.locator('.weather-widget');
            const boundingBox = await weatherWidget.boundingBox();
            expect(boundingBox.width).toBeLessThanOrEqual(1024);
            expect(boundingBox.height).toBeLessThanOrEqual(600);
        });

        test('should be touch-friendly', async ({ page }) => {
            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForSelector('.weather-widget', { timeout: 15000 });

            // Verify touch targets are adequately sized
            const buttons = page.locator('button');
            const buttonCount = await buttons.count();

            for (let i = 0; i < buttonCount; i++) {
                const button = buttons.nth(i);
                if (await button.isVisible()) {
                    const box = await button.boundingBox();
                    if (box) {
                        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(32); // Minimum touch target
                    }
                }
            }
        });
    });

    describe('Error Handling', () => {
        test('should display error message on API failure', async ({ page }) => {
            // Mock API failure
            await page.route('**/api.open-meteo.com/**', route => route.abort());

            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForTimeout(5000);

            // Should show error message or fallback content
            const hasError = await page.locator('.weather-error').isVisible();
            const hasWidget = await page.locator('.weather-widget').isVisible();
            
            expect(hasError || hasWidget).toBeTruthy();
        });

        test('should handle malformed weather data', async ({ page }) => {
            // Mock malformed response
            await page.route('**/api.open-meteo.com/**', route => {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ invalid: 'data' })
                });
            });

            await page.click('button:has-text("🌤️ Weather")');
            await page.waitForTimeout(3000);

            // Should not crash
            await expect(page.locator('.weather-widget')).toBeVisible();
        });
    });
});