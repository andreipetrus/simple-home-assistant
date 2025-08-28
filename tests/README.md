# DogeAssistant Testing Infrastructure

## Overview

This testing suite provides comprehensive coverage for the DogeAssistant project, focusing on calendar functionality with the provided Outlook ICS URL:
`https://outlook.live.com/owa/calendar/3a0fc431-b768-4780-9935-fed5dd92745a/e57bc9e7-8ed4-41f4-a140-d060db7398d4/cid-7D956C0517CE295E/calendar.ics`

## Test Structure

```
tests/
├── unit/                   # Unit tests
│   └── calendar.test.js   # Calendar parsing and validation
├── integration/           # Integration tests  
│   └── calendar-api.test.js # API endpoint testing
├── e2e/                   # End-to-end tests
│   ├── calendar.spec.js   # Calendar management workflow
│   └── dashboard.spec.js  # Dashboard functionality
├── fixtures/              # Test data and helpers
└── setup.js              # Test configuration and utilities
```

## Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests Only
```bash
npm test
```

### Integration Tests
```bash
npm test -- --testPathPattern=integration
```

### E2E Tests
```bash
npm run test:e2e
npm run test:e2e:headed  # With visible browser
```

### Specific Test Patterns
```bash
# Test calendar functionality only
npm test -- --testNamePattern=calendar

# Test with the real Outlook URL
npm test -- --testNamePattern="Outlook URL"
```

## Test Categories

### 1. Unit Tests (`tests/unit/calendar.test.js`)
- **ICS URL Validation**: Validates calendar URL formats
- **ICS Data Fetching**: Tests fetching calendar data with mocked responses
- **ICS Parsing**: Tests calendar event parsing and date filtering
- **Event Deduplication**: Tests event deduplication logic
- **Calendar Widget Integration**: Tests widget data structures

### 2. Integration Tests (`tests/integration/calendar-api.test.js`)
- **GET /api/calendars**: List calendars
- **POST /api/calendars**: Add new calendar (tests with real Outlook URL)
- **DELETE /api/calendars/:id**: Remove calendar
- **PUT /api/calendars/:id**: Update calendar settings
- **Data Persistence**: Verify data is saved to JSON files

### 3. E2E Tests (`tests/e2e/`)
- **Calendar Management**: Complete workflow of adding calendars via admin UI
- **Dashboard Integration**: Widget display and refresh functionality
- **Navigation**: Movement between admin and dashboard pages
- **Mobile Responsiveness**: Testing on different viewport sizes
- **Error Handling**: Graceful handling of network and data errors

## Test Features

### Real Data Testing
- Uses the provided Outlook ICS URL for realistic testing scenarios
- Tests actual calendar URL formats and validation
- Verifies API endpoints work with real calendar data

### Data Isolation
- Each test runs with clean data state
- Automatic backup and restore of data files
- Separate test fixtures and utilities

### Cross-Browser Testing
- Playwright E2E tests run on Chrome, Firefox, and Safari
- Mobile device emulation for tablet compatibility testing
- Visual regression testing capabilities

### Comprehensive Coverage
- **URL Validation**: Tests multiple calendar service formats
- **API Functionality**: Full CRUD operations for calendars
- **Widget Integration**: Complete calendar widget lifecycle
- **User Workflows**: End-to-end user interactions

## Test Configuration

### Jest Configuration (`jest.config.js`)
- Node.js environment for server-side testing
- Code coverage reporting
- Custom test setup and teardown
- Mock support for external dependencies

### Playwright Configuration (`playwright.config.js`)
- Multi-browser testing
- Automatic server startup for E2E tests
- Video and screenshot capture on failures
- Mobile device emulation

## Test Utilities

### Global Test Helpers (`tests/setup.js`)
- `testUtils.createTestCalendar()`: Generate test calendar data
- `testUtils.generateMockICS()`: Create mock ICS data
- `testUtils.cleanTestData()`: Reset test environment
- `testUtils.wait()`: Async delay utility

### Mock Data
- Realistic ICS calendar data for parsing tests
- Mock HTTP responses for network testing
- Sample calendar configurations

## Continuous Integration

The test suite is designed for CI environments:
- Headless browser testing
- Parallel test execution
- Comprehensive error reporting
- Coverage reports

## Adding New Tests

### Unit Tests
```javascript
test('should test new functionality', () => {
  // Arrange
  const input = createTestData();
  
  // Act
  const result = functionUnderTest(input);
  
  // Assert
  expect(result).toMatchExpectedOutput();
});
```

### Integration Tests
```javascript
test('should test API endpoint', async () => {
  const response = await request(app)
    .post('/api/endpoint')
    .send(testData);
    
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject(expectedData);
});
```

### E2E Tests
```javascript
test('should test user workflow', async ({ page }) => {
  await page.goto('/admin');
  await page.fill('#input', 'test value');
  await page.click('#submit');
  await expect(page.locator('.result')).toBeVisible();
});
```

## Coverage Goals

- **Unit Tests**: >90% code coverage for calendar functionality
- **Integration Tests**: 100% API endpoint coverage
- **E2E Tests**: Critical user paths and error scenarios
- **Real Data**: Validation with actual calendar services

This testing infrastructure ensures the DogeAssistant calendar functionality works reliably with real-world data and usage patterns.