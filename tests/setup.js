const fs = require('fs');
const path = require('path');

// Test setup and teardown utilities
global.testDataDir = path.join(__dirname, 'fixtures');

// Backup original data files before tests
const backupDataFiles = () => {
  const dataDir = path.join(__dirname, '../data');
  const backupDir = path.join(__dirname, 'fixtures/backup');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const files = ['config.json', 'calendars.json', 'credentials.json'];
  files.forEach(file => {
    const srcPath = path.join(dataDir, file);
    const backupPath = path.join(backupDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, backupPath);
    }
  });
};

// Restore original data files after tests
const restoreDataFiles = () => {
  const dataDir = path.join(__dirname, '../data');
  const backupDir = path.join(__dirname, 'fixtures/backup');
  
  const files = ['config.json', 'calendars.json', 'credentials.json'];
  files.forEach(file => {
    const srcPath = path.join(backupDir, file);
    const destPath = path.join(dataDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  });
};

// Clean test data
const cleanTestData = () => {
  const dataDir = path.join(__dirname, '../data');
  
  // Reset to empty/default state
  const defaultData = {
    'config.json': { theme: 'light', refreshInterval: 300000, showDebugInfo: false },
    'calendars.json': [],
    'credentials.json': {}
  };
  
  Object.keys(defaultData).forEach(file => {
    const filePath = path.join(dataDir, file);
    fs.writeFileSync(filePath, JSON.stringify(defaultData[file], null, 2));
  });
};

// Global test utilities
global.testUtils = {
  backupDataFiles,
  restoreDataFiles,
  cleanTestData,
  
  // Helper to create test calendar data
  createTestCalendar: (overrides = {}) => ({
    id: Date.now().toString(),
    name: 'Test Calendar',
    url: 'https://example.com/test.ics',
    enabled: true,
    refreshInterval: 300000,
    ...overrides
  }),
  
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to generate mock ICS data
  generateMockICS: (events = []) => {
    const defaultEvent = {
      uid: 'test-event-1@example.com',
      summary: 'Test Event',
      startDate: '20250801T140000Z',
      endDate: '20250801T150000Z',
      location: 'Test Location'
    };
    
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Test//Test Calendar//EN'
    ];
    
    events.forEach(event => {
      const eventData = { ...defaultEvent, ...event };
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${eventData.uid}`,
        `SUMMARY:${eventData.summary}`,
        `DTSTART:${eventData.startDate}`,
        `DTEND:${eventData.endDate}`,
        `LOCATION:${eventData.location}`,
        'END:VEVENT'
      );
    });
    
    icsContent.push('END:VCALENDAR');
    return icsContent.join('\r\n');
  }
};

// Setup before all tests
beforeAll(() => {
  backupDataFiles();
});

// Cleanup after all tests
afterAll(() => {
  restoreDataFiles();
});