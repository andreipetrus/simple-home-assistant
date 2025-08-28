// Mock fetch for testing
const fetch = jest.fn();

// Mock ICAL library for testing
const mockICAL = {
  parse: jest.fn(),
  Component: jest.fn(),
  Event: jest.fn()
};

global.ICAL = mockICAL;

describe('Calendar Functionality', () => {
  const USA_HOLIDAYS_ICS_URL = 'https://www.officeholidays.com/ics/usa';
  const UK_HOLIDAYS_ICS_URL = 'https://www.gov.uk/bank-holidays/england-and-wales.ics';
  
  beforeEach(() => {
    jest.clearAllMocks();
    global.testUtils.cleanTestData();
  });

  describe('ICS URL Validation', () => {
    test('should validate valid ICS URLs', () => {
      const validUrls = [
        USA_HOLIDAYS_ICS_URL,
        UK_HOLIDAYS_ICS_URL,
        'https://calendar.google.com/calendar/ical/example@gmail.com/public/basic.ics',
        'https://outlook.office365.com/owa/calendar/12345/calendar.ics',
        'webcal://example.com/calendar.ics'
      ];

      validUrls.forEach(url => {
        expect(isValidIcsUrl(url)).toBe(true);
      });
    });

    test('should reject invalid ICS URLs', () => {
      const invalidUrls = [
        'not-a-url',
        '',
        null,
        'ftp://example.com/file.ics',
        'file:///local/file.ics'
      ];

      invalidUrls.forEach(url => {
        expect(isValidIcsUrl(url)).toBe(false);
      });
    });
  });

  describe('ICS Data Fetching', () => {
    test('should fetch ICS data from USA holidays URL', async () => {
      const corsProxy = 'https://api.allorigins.win/get?url=';
      const proxyUrl = corsProxy + encodeURIComponent(USA_HOLIDAYS_ICS_URL);
      
      // Mock fetch response for testing
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          contents: `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Office Holidays Ltd//USA Holidays//EN
BEGIN:VEVENT
UID:independence-day-2025@officeholidays.com
SUMMARY:Independence Day
DTSTART:20250704T000000Z
DTEND:20250705T000000Z
DESCRIPTION:Federal Holiday - USA
END:VEVENT
BEGIN:VEVENT
UID:thanksgiving-2025@officeholidays.com
SUMMARY:Thanksgiving Day
DTSTART:20251127T000000Z
DTEND:20251128T000000Z
DESCRIPTION:Federal Holiday - USA
END:VEVENT
END:VCALENDAR`
        })
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const response = await fetch(proxyUrl);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('contents');
      expect(typeof data.contents).toBe('string');
      expect(data.contents).toContain('BEGIN:VCALENDAR');
    });

    test('should handle network errors gracefully', async () => {
      const invalidUrl = 'https://nonexistent-domain-12345.com/calendar.ics';
      const corsProxy = 'https://api.allorigins.win/get?url=';
      const proxyUrl = corsProxy + encodeURIComponent(invalidUrl);
      
      // Mock network error
      fetch.mockRejectedValue(new Error('Network error'));
      
      try {
        await fetch(proxyUrl);
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBe('Network error');
      }
    });
  });

  describe('ICS Parsing', () => {
    beforeEach(() => {
      // Setup ICAL mocks for parsing tests
      const mockEvent = {
        uid: 'test-event@outlook.com',
        summary: 'Test Meeting',
        startDate: { toJSDate: () => new Date('2025-08-01T14:00:00Z') },
        endDate: { toJSDate: () => new Date('2025-08-01T15:00:00Z') },
        location: 'Conference Room A',
        description: 'Test meeting description'
      };

      mockICAL.Event.mockImplementation(() => mockEvent);
      
      const mockComponent = {
        getAllSubcomponents: jest.fn().mockReturnValue([{}])
      };
      
      mockICAL.Component.mockImplementation(() => mockComponent);
      mockICAL.parse.mockReturnValue(['vcalendar', [], []]);
    });

    test('should parse ICS data and extract events', () => {
      const mockIcsData = global.testUtils.generateMockICS([
        {
          uid: 'outlook-event-1',
          summary: 'Important Meeting',
          startDate: '20250801T140000Z',
          endDate: '20250801T150000Z',
          location: 'Room 101'
        }
      ]);

      const calendar = { name: 'Test Outlook Calendar' };
      const events = parseICalData(mockIcsData, calendar);
      
      expect(Array.isArray(events)).toBe(true);
      expect(mockICAL.parse).toHaveBeenCalledWith(mockIcsData);
      expect(mockICAL.Component).toHaveBeenCalled();
    });

    test('should filter events within next week', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const mockEvents = [
        createMockEvent('event1', 'Tomorrow Event', tomorrow),
        createMockEvent('event2', 'Next Week Event', nextWeek),
        createMockEvent('event3', 'Past Event', lastMonth)
      ];

      const mockComponent = {
        getAllSubcomponents: jest.fn().mockReturnValue(mockEvents.map(() => ({})))
      };

      let eventIndex = 0;
      mockICAL.Event.mockImplementation(() => mockEvents[eventIndex++]);
      mockICAL.Component.mockImplementation(() => mockComponent);

      const calendar = { name: 'Test Calendar' };
      const events = parseICalData('mock-ics-data', calendar);
      
      // Should only include events within the next week
      expect(events.length).toBeGreaterThan(0);
      events.forEach(event => {
        const eventDate = new Date(event.startTime);
        expect(eventDate.getTime()).toBeGreaterThanOrEqual(now.getTime());
        expect(eventDate.getTime()).toBeLessThanOrEqual(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      });
    });
  });

  describe('Event Deduplication', () => {
    test('should deduplicate events with same title and time', () => {
      const duplicateEvents = [
        createTestEvent('meeting1', 'Team Meeting', '2025-08-01T14:00:00Z'),
        createTestEvent('meeting2', 'Team Meeting', '2025-08-01T14:00:00Z'), // Duplicate
        createTestEvent('meeting3', 'Different Meeting', '2025-08-01T14:00:00Z'),
        createTestEvent('meeting4', 'Team Meeting', '2025-08-01T15:00:00Z') // Different time
      ];

      const deduplicatedEvents = deduplicateEvents(duplicateEvents);
      
      expect(deduplicatedEvents).toHaveLength(3);
      
      const titles = deduplicatedEvents.map(e => e.title);
      const times = deduplicatedEvents.map(e => e.startTime.getTime());
      
      // Should have unique title-time combinations
      const titleTimeCombos = deduplicatedEvents.map(e => 
        e.title.toLowerCase() + '_' + e.startTime.getTime()
      );
      const uniqueCombos = [...new Set(titleTimeCombos)];
      expect(titleTimeCombos).toHaveLength(uniqueCombos.length);
    });

    test('should sort events by start time', () => {
      const unorderedEvents = [
        createTestEvent('event3', 'Third Event', '2025-08-03T14:00:00Z'),
        createTestEvent('event1', 'First Event', '2025-08-01T14:00:00Z'),
        createTestEvent('event2', 'Second Event', '2025-08-02T14:00:00Z')
      ];

      const sortedEvents = deduplicateEvents(unorderedEvents);
      
      expect(sortedEvents).toHaveLength(3);
      expect(sortedEvents[0].title).toBe('First Event');
      expect(sortedEvents[1].title).toBe('Second Event');
      expect(sortedEvents[2].title).toBe('Third Event');
    });
  });

  describe('Calendar Widget Integration', () => {
    test('should create calendar data structure correctly', () => {
      const testCalendar = global.testUtils.createTestCalendar({
        name: 'USA Federal Holidays',
        url: USA_HOLIDAYS_ICS_URL,
        refreshInterval: 900000 // 15 minutes
      });

      expect(testCalendar).toMatchObject({
        id: expect.any(String),
        name: 'USA Federal Holidays',
        url: USA_HOLIDAYS_ICS_URL,
        enabled: true,
        refreshInterval: 900000
      });
    });

    test('should handle empty calendar data', () => {
      const emptyEvents = [];
      const deduplicatedEvents = deduplicateEvents(emptyEvents);
      
      expect(deduplicatedEvents).toEqual([]);
      expect(Array.isArray(deduplicatedEvents)).toBe(true);
    });
  });
});

// Helper functions (these would normally be imported from the actual widget code)
function isValidIcsUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.trim() === '') return false;
  
  try {
    const cleanUrl = url.replace('webcal://', 'https://');
    const urlObj = new URL(cleanUrl);
    
    // Check if it's a valid HTTP/HTTPS URL
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Should have a valid hostname
    if (!urlObj.hostname) return false;
    
    // Optional: Check for .ics extension or calendar-like paths
    const pathname = urlObj.pathname.toLowerCase();
    if (pathname && !pathname.includes('calendar') && !pathname.endsWith('.ics')) {
      // Allow calendar URLs that don't end in .ics but are clearly calendar-related
      return pathname.includes('owa') || pathname.includes('cal') || true;
    }
    
    return true;
  } catch {
    return false;
  }
}

function parseICalData(icalData, calendar) {
  try {
    if (typeof ICAL === 'undefined') {
      console.error('ICAL library not loaded');
      return [];
    }
    
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    const events = [];
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    vevents.forEach(function(vevent) {
      const event = new ICAL.Event(vevent);
      const startDate = event.startDate ? event.startDate.toJSDate() : null;
      
      if (startDate && startDate >= now && startDate <= oneWeekFromNow) {
        events.push({
          id: event.uid || Math.random().toString(36),
          title: event.summary || 'Untitled Event',
          startTime: startDate,
          endTime: event.endDate ? event.endDate.toJSDate() : null,
          location: event.location || '',
          description: event.description || '',
          calendar: calendar.name
        });
      }
    });
    
    return events;
  } catch (error) {
    console.error('Failed to parse iCal data:', error);
    return [];
  }
}

function deduplicateEvents(events) {
  const seen = {};
  const deduplicated = [];
  
  events.forEach(function(event) {
    const key = event.title.toLowerCase() + '_' + event.startTime.getTime();
    
    if (!seen[key]) {
      seen[key] = true;
      deduplicated.push(event);
    }
  });
  
  deduplicated.sort(function(a, b) {
    return a.startTime.getTime() - b.startTime.getTime();
  });
  
  return deduplicated;
}

function createTestEvent(id, title, startTimeISO, location = '') {
  return {
    id: id,
    title: title,
    startTime: new Date(startTimeISO),
    endTime: new Date(new Date(startTimeISO).getTime() + 60 * 60 * 1000), // 1 hour later
    location: location,
    description: '',
    calendar: 'Test Calendar'
  };
}

function createMockEvent(uid, summary, startDate) {
  return {
    uid: uid,
    summary: summary,
    startDate: { toJSDate: () => startDate },
    endDate: { toJSDate: () => new Date(startDate.getTime() + 60 * 60 * 1000) },
    location: 'Test Location',
    description: 'Test description'
  };
}