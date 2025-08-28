const { test, expect } = require('@playwright/test');

test.describe('Calendar Management E2E Tests', () => {
  const USA_HOLIDAYS_ICS_URL = 'https://www.officeholidays.com/ics/usa';
  const UK_HOLIDAYS_ICS_URL = 'https://www.gov.uk/bank-holidays/england-and-wales.ics';
  const USA_CALENDAR_NAME = 'USA Federal Holidays';
  const UK_CALENDAR_NAME = 'UK Bank Holidays';

  test.beforeEach(async ({ page }) => {
    // Clean test data before each test
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test('should add both USA and UK holiday calendars', async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Page console error:', msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });
    
    await page.goto('/admin');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check for any error toast messages
    const errorToast = page.locator('#errorToast');
    const successToast = page.locator('#successToast');
    
    // Add USA holidays calendar
    await page.fill('#calendarName', USA_CALENDAR_NAME);
    await page.fill('#calendarUrl', USA_HOLIDAYS_ICS_URL);
    await page.selectOption('#calendarInterval', '900000'); // 15 minutes
    
    // Click add and wait for response or error
    await page.click('#addCalendar');
    
    // Wait for either success or error message
    await Promise.race([
      page.waitForSelector('#successToast.show', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('#errorToast.show', { timeout: 5000 }).catch(() => null)
    ]);
    
    // Check if there's an error message
    const hasError = await errorToast.locator('.show').count() > 0;
    if (hasError) {
      const errorMessage = await page.locator('#errorMessage').textContent();
      console.log('First calendar error:', errorMessage);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'first-calendar-error.png' });
      
      // Fail the test with the error message
      throw new Error(`Failed to add first calendar: ${errorMessage}`);
    }
    
    // Wait for first calendar to appear
    await page.waitForTimeout(2000);
    
    // Clear form and add UK holidays calendar
    await page.fill('#calendarName', '');
    await page.fill('#calendarUrl', '');
    
    await page.fill('#calendarName', UK_CALENDAR_NAME);
    await page.fill('#calendarUrl', UK_HOLIDAYS_ICS_URL);
    await page.selectOption('#calendarInterval', '1800000'); // 30 minutes
    
    // Click add and wait for response or error
    await page.click('#addCalendar');
    
    // Wait for either success or error message
    await Promise.race([
      page.waitForSelector('#successToast.show', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('#errorToast.show', { timeout: 5000 }).catch(() => null)
    ]);
    
    // Check if there's an error message
    const hasSecondError = await errorToast.locator('.show').count() > 0;
    if (hasSecondError) {
      const errorMessage = await page.locator('#errorMessage').textContent();
      console.log('Second calendar error:', errorMessage);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'second-calendar-error.png' });
      
      // Fail the test with the error message
      throw new Error(`Failed to add second calendar: ${errorMessage}`);
    }
    
    // Wait for UI to update
    await page.waitForTimeout(2000);
    
    // Verify both calendars appear in the calendar list
    const calendarList = page.locator('#calendarList');
    await expect(calendarList).toBeVisible();
    
    // Check that we have calendar items - wait for them to appear
    const calendarItems = calendarList.locator('.calendar-item');
    await expect(calendarItems).toHaveCount(2, { timeout: 10000 });
    
    // Verify first calendar (USA)
    const firstCalendar = calendarItems.first();
    await expect(firstCalendar).toBeVisible();
    await expect(firstCalendar.locator('h4')).toContainText(USA_CALENDAR_NAME);
    await expect(firstCalendar).toContainText(USA_HOLIDAYS_ICS_URL);
    await expect(firstCalendar).toContainText('15 minutes');
    
    // Verify second calendar (UK)
    const secondCalendar = calendarItems.nth(1);
    await expect(secondCalendar).toBeVisible();
    await expect(secondCalendar.locator('h4')).toContainText(UK_CALENDAR_NAME);
    await expect(secondCalendar).toContainText(UK_HOLIDAYS_ICS_URL);
    await expect(secondCalendar).toContainText('30 minutes');
  });

  test('should display calendar events in dashboard after adding calendar', async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Page console error:', msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });
    
    // First, go to admin and add a calendar
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Add USA holidays calendar (should have events)
    await page.fill('#calendarName', USA_CALENDAR_NAME);
    await page.fill('#calendarUrl', USA_HOLIDAYS_ICS_URL);
    await page.selectOption('#calendarInterval', '900000'); // 15 minutes
    
    // Wait for success message after adding calendar
    await page.click('#addCalendar');
    await Promise.race([
      page.waitForSelector('#successToast.show', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('#errorToast.show', { timeout: 5000 }).catch(() => null)
    ]);
    
    // Check for any errors
    const errorToast = page.locator('#errorToast');
    const hasError = await errorToast.locator('.show').count() > 0;
    if (hasError) {
      const errorMessage = await page.locator('#errorMessage').textContent();
      console.log('Calendar addition error:', errorMessage);
      throw new Error(`Failed to add calendar: ${errorMessage}`);
    }
    
    // Now navigate to the dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for widgets to load and initialize
    await page.waitForTimeout(2000);
    
    // Check that the calendar widget exists
    const calendarWidget = page.locator('#calendar-widget');
    await expect(calendarWidget).toBeVisible({ timeout: 10000 });
    
    // Check that the calendar widget shows it's loading or has content
    const widgetContent = calendarWidget.locator('.widget-content');
    await expect(widgetContent).toBeVisible();
    
    // Wait for calendar data to load (ICAL parsing and CORS proxy can take time)
    console.log('Waiting for calendar data to load...');
    await page.waitForTimeout(10000);
    
    // Look for calendar events in the widget
    // Events should appear as .event-item elements within .event-list
    const eventList = calendarWidget.locator('.event-list');
    const eventElements = calendarWidget.locator('.event-item');
    
    // Check if we have at least one event OR if there's a "no events" message
    const eventCount = await eventElements.count();
    const noEventsMessage = calendarWidget.locator('.no-events');
    const hasNoEventsMessage = await noEventsMessage.count() > 0;
    
    // Log current widget content for debugging
    const currentContent = await widgetContent.innerHTML();
    console.log('Current widget content:', currentContent);
    
    // Log what we found for debugging
    if (eventCount > 0) {
      console.log(`Found ${eventCount} calendar events in widget`);
      
      // Verify the event list is visible
      await expect(eventList).toBeVisible();
      
      // Verify first event has expected content
      const firstEvent = eventElements.first();
      await expect(firstEvent).toBeVisible();
      
      // Check for event title (should always be present)
      const eventTitle = firstEvent.locator('.event-title');
      await expect(eventTitle).toBeVisible();
      
      // Check that events contain meaningful content
      const eventText = await firstEvent.textContent();
      expect(eventText).toBeTruthy();
      expect(eventText.length).toBeGreaterThan(5); // Should have meaningful content
      console.log('First event content:', eventText);
      
      // If it's not an all-day event, check for time display
      const eventTime = firstEvent.locator('.event-time');
      const hasTime = await eventTime.count() > 0;
      if (hasTime) {
        const timeText = await eventTime.textContent();
        expect(timeText).toBeTruthy();
        console.log('Event time:', timeText);
      }
    } else if (hasNoEventsMessage) {
      const messageText = await noEventsMessage.first().textContent();
      console.log('Calendar widget message:', messageText);
      
      // This is acceptable - there might be no events in the next 7 days
      expect(messageText).toBeTruthy();
    } else {
      // Take screenshot for debugging
      await page.screenshot({ path: 'calendar-widget-debug.png' });
      
      // Get the widget HTML for debugging
      const widgetHTML = await calendarWidget.innerHTML();
      console.log('Calendar widget HTML:', widgetHTML);
      
      throw new Error('Calendar widget should show either events or a "no events" message');
    }
    
    // Verify that the widget shows it's connected/online (not in error state)
    const widgetStatus = calendarWidget.locator('.widget-status');
    if (await widgetStatus.count() > 0) {
      const statusText = await widgetStatus.textContent();
      console.log('Calendar widget status:', statusText);
      
      // Status should not indicate an error
      expect(statusText).not.toContain('Error');
      expect(statusText).not.toContain('Failed');
    }
  });
});