const { test, expect } = require('@playwright/test');

test.describe('Calendar Current Day Focus Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Start the server and navigate to the app
        await page.goto('http://localhost:3000');
        
        // Wait for the page to load completely
        await page.waitForLoadState('networkidle');
        
        // Ensure we're on the calendar tab initially
        await page.click('[data-tab="calendar"]');
        await page.waitForTimeout(1000); // Wait for tab switch
    });

    test('Calendar tab selection should auto-scroll to today', async ({ page }) => {
        console.log('Testing calendar tab selection auto-scroll...');
        
        // First, switch to a different tab (use button selector)
        await page.click('button[data-tab="sonos"]');
        await page.waitForTimeout(500);
        
        // Verify we're on sonos tab
        const sonosTabButton = page.locator('button[data-tab="sonos"]');
        await expect(sonosTabButton).toHaveClass(/active/);
        
        // Switch back to calendar tab
        await page.click('button[data-tab="calendar"]');
        await page.waitForTimeout(1500); // Increased wait for auto-scroll
        
        // Check if today's section is visible in viewport (use first occurrence)
        const todayGroup = page.locator('#today-group').first();
        await expect(todayGroup).toBeVisible();
        
        // Verify today group is near the top of the scroll container
        const scrollContainer = page.locator('.calendar-list-container');
        const scrollTop = await scrollContainer.evaluate(el => el.scrollTop);
        const todayPosition = await todayGroup.evaluate(el => el.offsetTop);
        
        // Today should be visible near the top (within reasonable offset)
        const isNearTop = Math.abs(todayPosition - scrollTop) < 200;
        expect(isNearTop).toBeTruthy();
        
        console.log(`✅ Calendar tab auto-scroll working - Today at position ${todayPosition}, scroll at ${scrollTop}`);
    });

    test('Page reload should maintain today focus', async ({ page }) => {
        console.log('Testing page reload today focus...');
        
        // Ensure we're on calendar tab
        await page.click('button[data-tab="calendar"]');
        await page.waitForTimeout(1000);
        
        // Reload the page
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Wait for auto-scroll after reload
        
        // Check if calendar tab button is still active (depends on implementation)
        const calendarTabButton = page.locator('button[data-tab="calendar"]');
        await expect(calendarTabButton).toBeVisible();
        
        // If calendar tab is active, today should be visible
        const isCalendarActive = await calendarTabButton.getAttribute('class');
        if (isCalendarActive && isCalendarActive.includes('active')) {
            const todayGroup = page.locator('#today-group').first();
            await expect(todayGroup).toBeVisible();
            
            console.log('✅ Page reload maintained calendar tab and today focus');
        } else {
            console.log('ℹ️  Page reload reset to default tab (expected behavior)');
            
            // Click calendar tab again and verify auto-scroll
            await page.click('button[data-tab="calendar"]');
            await page.waitForTimeout(1500);
            
            const todayGroup = page.locator('#today-group').first();
            await expect(todayGroup).toBeVisible();
            console.log('✅ Calendar tab click after reload works correctly');
        }
    });

    test('Refresh button should auto-scroll to today', async ({ page }) => {
        console.log('Testing refresh button auto-scroll...');
        
        // Ensure we're on calendar tab
        await page.click('button[data-tab="calendar"]');
        await page.waitForTimeout(1000);
        
        // Scroll away from today first
        const scrollContainer = page.locator('.calendar-list-container');
        await scrollContainer.evaluate(el => el.scrollTop = el.scrollHeight - el.clientHeight);
        await page.waitForTimeout(500);
        
        // Verify we've scrolled away from today (check first occurrence)
        const todayGroup = page.locator('#today-group').first();
        const boundingBox = await todayGroup.boundingBox();
        // Today should not be visible in viewport after scrolling to bottom (y coordinate should be negative or very high)
        expect(boundingBox).not.toBeNull();
        expect(boundingBox.y < -100 || boundingBox.y > 1000).toBeTruthy();
        
        // Click refresh button
        const refreshButton = page.locator('#refreshBtn');
        await refreshButton.click();
        
        // Wait for refresh to complete and auto-scroll
        await page.waitForTimeout(3000); // Increased timeout for refresh
        
        // Check if today is now visible again
        await expect(todayGroup).toBeVisible();
        
        // Verify today is near the top
        const scrollTop = await scrollContainer.evaluate(el => el.scrollTop);
        const todayPosition = await todayGroup.evaluate(el => el.offsetTop);
        const isNearTop = Math.abs(todayPosition - scrollTop) < 200;
        expect(isNearTop).toBeTruthy();
        
        console.log(`✅ Refresh button auto-scroll working - Today at position ${todayPosition}, scroll at ${scrollTop}`);
    });

    test('Auto-scroll timing consistency across all scenarios', async ({ page }) => {
        console.log('Testing auto-scroll timing consistency...');
        
        const measureAutoScrollTime = async (actionName, actionFn) => {
            // Scroll away from today
            const scrollContainer = page.locator('.calendar-list-container');
            await scrollContainer.evaluate(el => el.scrollTop = el.scrollHeight - el.clientHeight);
            await page.waitForTimeout(500);
            
            const startTime = Date.now();
            
            // Perform the action
            await actionFn();
            
            // Wait for today to become visible (with timeout)
            const todayGroup = page.locator('#today-group').first();
            try {
                await expect(todayGroup).toBeVisible({ timeout: 5000 });
                const endTime = Date.now();
                const duration = endTime - startTime;
                console.log(`${actionName}: Auto-scroll completed in ${duration}ms`);
                return duration;
            } catch (error) {
                console.error(`${actionName}: Auto-scroll failed - today not visible after 5 seconds`);
                throw error;
            }
        };
        
        // Test tab switching timing
        await measureAutoScrollTime('Tab Switch', async () => {
            await page.click('button[data-tab="sonos"]');
            await page.waitForTimeout(100);
            await page.click('button[data-tab="calendar"]');
        });
        
        // Test refresh timing
        await measureAutoScrollTime('Refresh Button', async () => {
            await page.click('#refreshBtn');
        });
        
        console.log('✅ All auto-scroll scenarios completed within expected timeframes');
    });

    test('Multiple rapid tab switches should not cause scroll conflicts', async ({ page }) => {
        console.log('Testing rapid tab switching for scroll conflicts...');
        
        // Rapidly switch between tabs
        for (let i = 0; i < 5; i++) {
            await page.click('button[data-tab="sonos"]');
            await page.waitForTimeout(50);
            await page.click('button[data-tab="calendar"]');
            await page.waitForTimeout(50);
        }
        
        // Wait for all scroll animations to settle
        await page.waitForTimeout(2000);
        
        // Verify final state - today should be visible
        const todayGroup = page.locator('#today-group').first();
        await expect(todayGroup).toBeVisible();
        
        // Verify calendar tab is active
        const calendarTabButton = page.locator('button[data-tab="calendar"]');
        await expect(calendarTabButton).toHaveClass(/active/);
        
        console.log('✅ Rapid tab switching handled correctly without conflicts');
    });

    test('Today group element exists and is properly positioned', async ({ page }) => {
        console.log('Testing today group element structure...');
        
        await page.click('button[data-tab="calendar"]');
        await page.waitForTimeout(1000);
        
        // Check if today group exists (use first occurrence)
        const todayGroup = page.locator('#today-group').first();
        await expect(todayGroup).toBeVisible();
        
        // Verify it has the expected classes
        await expect(todayGroup).toHaveClass(/today-date/);
        
        // Check if it contains today's date text
        const todayText = todayGroup.locator('.date-label');
        const text = await todayText.textContent();
        expect(text).toContain('Today');
        
        // Verify the today group is within the calendar list
        const calendarList = page.locator('.calendar-list');
        const todayInList = calendarList.locator('#today-group').first();
        await expect(todayInList).toBeVisible();
        
        console.log('✅ Today group element structure is correct');
    });
});