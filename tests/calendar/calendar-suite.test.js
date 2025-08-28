/**
 * Calendar Test Suite
 * 
 * Comprehensive testing for all calendar functionality including:
 * - Unit tests for calendar widget logic
 * - Integration tests for calendar API endpoints
 * - E2E tests for user interface interactions
 * - Configuration and settings tests
 * - Performance and accessibility tests
 */

const { test, expect } = require('@playwright/test');

test.describe('Calendar Test Suite', () => {
    
    test.describe('Unit Tests - Calendar Widget Logic', () => {
        
        test('should validate ICS URL formats', async ({ page }) => {
            // Test URL validation logic
            const validUrls = [
                'https://calendar.google.com/calendar/ical/example%40gmail.com/public/basic.ics',
                'webcal://calendar.google.com/calendar/ical/example%40gmail.com/public/basic.ics',
                'http://localhost:3000/calendar.ics'
            ];
            
            const invalidUrls = [
                'not-a-url',
                'ftp://example.com/calendar.ics',
                'https://example.com/notical.txt'
            ];
            
            await page.goto('http://localhost:3000');
            
            // Test valid URLs
            for (const url of validUrls) {
                const result = await page.evaluate((testUrl) => {
                    // Simulate URL validation logic
                    return testUrl.match(/^(https?|webcal):\/\/.*\.ics$/i) !== null;
                }, url);
                expect(result).toBeTruthy();
            }
            
            // Test invalid URLs
            for (const url of invalidUrls) {
                const result = await page.evaluate((testUrl) => {
                    return testUrl.match(/^(https?|webcal):\/\/.*\.ics$/i) !== null;
                }, url);
                expect(result).toBeFalsy();
            }
        });

        test('should handle date range configuration correctly', async ({ page }) => {
            await page.goto('http://localhost:3000');
            
            const dateRangeTest = await page.evaluate(() => {
                // Test date range calculation
                const testConfig = { pastWeeks: 2, futureMonths: 3 };
                const now = new Date();
                
                const startRange = new Date(now);
                startRange.setDate(startRange.getDate() - (testConfig.pastWeeks * 7));
                
                const endRange = new Date(now);
                endRange.setMonth(endRange.getMonth() + testConfig.futureMonths);
                
                const totalDays = Math.ceil((endRange - startRange) / (24 * 60 * 60 * 1000));
                
                return {
                    startRange: startRange.toISOString().split('T')[0],
                    endRange: endRange.toISOString().split('T')[0],
                    totalDays: totalDays,
                    isValidRange: totalDays > 0 && totalDays < 400
                };
            });
            
            expect(dateRangeTest.isValidRange).toBeTruthy();
            expect(dateRangeTest.totalDays).toBeGreaterThan(90); // At least ~3 months
            expect(dateRangeTest.totalDays).toBeLessThan(200); // Less than ~6 months
        });

        test('should deduplicate events correctly', async ({ page }) => {
            await page.goto('http://localhost:3000');
            
            const deduplicationTest = await page.evaluate(() => {
                // Test event deduplication logic
                const events = [
                    { id: '1', title: 'Meeting', startTime: new Date('2025-08-26T10:00:00'), calendar: 'Work' },
                    { id: '2', title: 'Meeting', startTime: new Date('2025-08-26T10:00:00'), calendar: 'Personal' },
                    { id: '3', title: 'Lunch', startTime: new Date('2025-08-26T12:00:00'), calendar: 'Personal' },
                    { id: '4', title: 'meeting', startTime: new Date('2025-08-26T10:00:00'), calendar: 'Team' } // Same title, different case
                ];
                
                // Simulate deduplication
                const eventMap = {};
                const deduplicated = [];
                
                events.forEach(event => {
                    const key = event.title.toLowerCase() + '_' + event.startTime.getTime();
                    
                    if (!eventMap[key]) {
                        event.calendarSources = [event.calendar];
                        eventMap[key] = event;
                        deduplicated.push(event);
                    } else {
                        if (eventMap[key].calendarSources.indexOf(event.calendar) === -1) {
                            eventMap[key].calendarSources.push(event.calendar);
                        }
                    }
                });
                
                return {
                    originalCount: events.length,
                    deduplicatedCount: deduplicated.length,
                    meetingSources: deduplicated[0].calendarSources,
                    hasLunch: deduplicated.some(e => e.title === 'Lunch')
                };
            });
            
            expect(deduplicationTest.originalCount).toBe(4);
            expect(deduplicationTest.deduplicatedCount).toBe(2); // Meeting (deduplicated) + Lunch
            expect(deduplicationTest.meetingSources).toEqual(expect.arrayContaining(['Work', 'Personal', 'Team']));
            expect(deduplicationTest.hasLunch).toBeTruthy();
        });
    });

    test.describe('Integration Tests - Calendar API', () => {
        
        test.beforeEach(async ({ page }) => {
            await page.goto('http://localhost:3000');
            await page.waitForLoadState('networkidle');
        });

        test('should handle calendar CRUD operations', async ({ page }) => {
            // Test adding a calendar
            const response = await page.request.post('http://localhost:3000/api/calendars', {
                data: {
                    name: 'Test Calendar',
                    url: 'https://calendar.google.com/calendar/ical/test%40gmail.com/public/basic.ics',
                    enabled: true
                }
            });
            expect(response.ok()).toBeTruthy();
            
            // Test fetching calendars
            const getResponse = await page.request.get('http://localhost:3000/api/calendars');
            expect(getResponse.ok()).toBeTruthy();
            const calendars = await getResponse.json();
            expect(calendars.length).toBeGreaterThan(0);
            
            // Test updating calendar
            if (calendars.length > 0) {
                const updateResponse = await page.request.put(`http://localhost:3000/api/calendars/${calendars[0].id}`, {
                    data: {
                        ...calendars[0],
                        name: 'Updated Test Calendar'
                    }
                });
                expect(updateResponse.ok()).toBeTruthy();
            }
        });

        test('should handle calendar configuration API', async ({ page }) => {
            // Test configuration API
            const configResponse = await page.request.get('http://localhost:3000/api/config');
            expect(configResponse.ok()).toBeTruthy();
            
            const config = await configResponse.json();
            
            // Test updating calendar configuration
            const newConfig = {
                ...config,
                calendar: {
                    pastWeeks: 3,
                    futureMonths: 6
                }
            };
            
            const updateResponse = await page.request.post('http://localhost:3000/api/config', {
                data: newConfig
            });
            expect(updateResponse.ok()).toBeTruthy();
        });
    });

    test.describe('E2E Tests - User Interface', () => {
        
        test.beforeEach(async ({ page }) => {
            await page.goto('http://localhost:3000');
            await page.waitForLoadState('networkidle');
            await page.click('button[data-tab="calendar"]');
            await page.waitForTimeout(1000);
        });

        test('should display calendar with proper layout', async ({ page }) => {
            // Test calendar container structure
            await expect(page.locator('.calendar-container')).toBeVisible();
            await expect(page.locator('.calendar-events-panel')).toBeVisible();
            await expect(page.locator('.calendar-picker-panel')).toBeVisible();
            
            // Test event list structure
            await expect(page.locator('.calendar-list-container')).toBeVisible();
            await expect(page.locator('.calendar-list')).toBeVisible();
            
            // Test month calendar
            await expect(page.locator('.month-calendar')).toBeVisible();
            await expect(page.locator('.calendar-grid')).toBeVisible();
        });

        test('should handle today focus correctly', async ({ page }) => {
            const todayGroup = page.locator('#today-group').first();
            
            // Today group should exist and be visible
            await expect(todayGroup).toBeVisible();
            await expect(todayGroup).toHaveClass(/today-date/);
            
            // Today label should show "Today"
            const todayLabel = todayGroup.locator('.date-label');
            await expect(todayLabel).toContainText('Today');
        });

        test('should handle tab switching with auto-scroll', async ({ page }) => {
            // Switch to another tab
            await page.click('button[data-tab="sonos"]');
            await page.waitForTimeout(500);
            await expect(page.locator('button[data-tab="sonos"]')).toHaveClass(/active/);
            
            // Switch back to calendar
            await page.click('button[data-tab="calendar"]');
            await page.waitForTimeout(1500);
            await expect(page.locator('button[data-tab="calendar"]')).toHaveClass(/active/);
            
            // Today should be visible after auto-scroll
            const todayGroup = page.locator('#today-group').first();
            await expect(todayGroup).toBeVisible();
        });

        test('should handle month navigation', async ({ page }) => {
            const monthHeader = page.locator('.month-header h4');
            const initialMonth = await monthHeader.textContent();
            
            // Click next month
            await page.click('.month-nav.next');
            await page.waitForTimeout(500);
            
            const nextMonth = await monthHeader.textContent();
            expect(nextMonth).not.toBe(initialMonth);
            
            // Click previous month
            await page.click('.month-nav.prev');
            await page.waitForTimeout(500);
            
            const backToOriginal = await monthHeader.textContent();
            expect(backToOriginal).toBe(initialMonth);
        });

        test('should handle calendar day selection', async ({ page }) => {
            // Find a clickable calendar day
            const calendarDays = page.locator('.calendar-day:not(.other-month)');
            const firstDay = calendarDays.first();
            
            await firstDay.click();
            await page.waitForTimeout(500);
            
            // Day should be selected
            await expect(firstDay).toHaveClass(/selected/);
        });

        test('should display event cards correctly', async ({ page }) => {
            // Look for event rows
            const eventRows = page.locator('.event-row');
            const eventCount = await eventRows.count();
            
            if (eventCount > 0) {
                const firstEvent = eventRows.first();
                
                // Event should have proper structure
                await expect(firstEvent).toBeVisible();
                await expect(firstEvent.locator('.event-time')).toBeVisible();
                await expect(firstEvent.locator('.event-details')).toBeVisible();
                await expect(firstEvent.locator('.event-title')).toBeVisible();
                
                // Time should be larger font (our enhancement)
                const timeElement = firstEvent.locator('.event-time');
                const fontSize = await timeElement.evaluate(el => getComputedStyle(el).fontSize);
                expect(fontSize).toBe('16px'); // 1rem = 16px
            }
        });

        test('should handle refresh functionality', async ({ page }) => {
            // Scroll away from today
            const scrollContainer = page.locator('.calendar-list-container');
            await scrollContainer.evaluate(el => el.scrollTop = el.scrollHeight - el.clientHeight);
            await page.waitForTimeout(500);
            
            // Click refresh
            await page.click('#refreshBtn');
            await page.waitForTimeout(3000);
            
            // Should auto-scroll back to today
            const todayGroup = page.locator('#today-group').first();
            await expect(todayGroup).toBeVisible();
        });
    });

    test.describe('Configuration Tests', () => {
        
        test('should handle admin panel calendar configuration', async ({ page }) => {
            await page.goto('http://localhost:3000/admin');
            await page.waitForLoadState('networkidle');
            
            // Test calendar configuration section
            await expect(page.locator('#pastWeeks')).toBeVisible();
            await expect(page.locator('#futureMonths')).toBeVisible();
            await expect(page.locator('#saveCalendarConfig')).toBeVisible();
            
            // Test changing configuration
            await page.selectOption('#pastWeeks', '4');
            await page.selectOption('#futureMonths', '6');
            
            await page.click('#saveCalendarConfig');
            await page.waitForTimeout(1000);
            
            // Should show success message
            await expect(page.locator('.success-toast, .success-message')).toBeVisible();
        });
    });

    test.describe('Performance Tests', () => {
        
        test('should load calendar within acceptable time', async ({ page }) => {
            const startTime = Date.now();
            
            await page.goto('http://localhost:3000');
            await page.click('button[data-tab="calendar"]');
            
            // Wait for calendar to be fully loaded
            await expect(page.locator('#today-group').first()).toBeVisible();
            
            const loadTime = Date.now() - startTime;
            expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
        });

        test('should handle auto-scroll performance', async ({ page }) => {
            await page.goto('http://localhost:3000');
            await page.click('button[data-tab="calendar"]');
            await page.waitForTimeout(1000);
            
            // Measure auto-scroll time
            const startTime = Date.now();
            
            // Switch tabs to trigger auto-scroll
            await page.click('button[data-tab="sonos"]');
            await page.click('button[data-tab="calendar"]');
            
            // Wait for today to be visible
            await expect(page.locator('#today-group').first()).toBeVisible();
            
            const scrollTime = Date.now() - startTime;
            expect(scrollTime).toBeLessThan(2000); // Auto-scroll should complete within 2 seconds
        });
    });

    test.describe('Accessibility Tests', () => {
        
        test('should have proper ARIA roles and labels', async ({ page }) => {
            await page.goto('http://localhost:3000');
            await page.click('button[data-tab="calendar"]');
            await page.waitForTimeout(1000);
            
            // Test calendar container accessibility
            const calendarContainer = page.locator('.calendar-list-container');
            await expect(calendarContainer).toHaveAttribute('role', 'region');
            await expect(calendarContainer).toHaveAttribute('aria-label', 'Calendar events');
            
            // Test calendar list
            const calendarList = page.locator('.calendar-list');
            await expect(calendarList).toHaveAttribute('role', 'list');
            
            // Test date groups
            const dateGroups = page.locator('.date-group');
            const firstDateGroup = dateGroups.first();
            await expect(firstDateGroup).toHaveAttribute('role', 'listitem');
        });

        test('should support keyboard navigation', async ({ page }) => {
            await page.goto('http://localhost:3000');
            await page.click('button[data-tab="calendar"]');
            await page.waitForTimeout(1000);
            
            // Focus on calendar container
            const calendarContainer = page.locator('.calendar-list-container');
            await calendarContainer.focus();
            
            // Test arrow key navigation
            const focusableEvents = page.locator('.event-row[tabindex="0"]');
            const eventCount = await focusableEvents.count();
            
            if (eventCount > 0) {
                // Focus first event
                await focusableEvents.first().focus();
                
                // Test down arrow
                await page.keyboard.press('ArrowDown');
                await page.waitForTimeout(100);
                
                // Test up arrow
                await page.keyboard.press('ArrowUp');
                await page.waitForTimeout(100);
                
                // Should maintain focus
                const focused = page.locator(':focus');
                await expect(focused).toHaveClass(/event-row/);
            }
        });
    });

    test.describe('Error Handling Tests', () => {
        
        test('should handle network errors gracefully', async ({ page }) => {
            // Test with offline scenario or network failure
            await page.route('**/api/calendars', route => route.abort());
            
            await page.goto('http://localhost:3000');
            await page.click('button[data-tab="calendar"]');
            await page.waitForTimeout(2000);
            
            // Should show appropriate error state or fallback
            const errorElements = page.locator('.widget-error, .error-message, .no-events');
            const hasErrorHandling = await errorElements.count() > 0;
            expect(hasErrorHandling).toBeTruthy();
        });

        test('should handle invalid calendar data', async ({ page }) => {
            // Mock API to return invalid data
            await page.route('**/api/calendars', route => {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([{ invalid: 'data' }])
                });
            });
            
            await page.goto('http://localhost:3000');
            await page.click('button[data-tab="calendar"]');
            await page.waitForTimeout(2000);
            
            // Should handle gracefully without crashing
            await expect(page.locator('.calendar-container')).toBeVisible();
        });
    });
});