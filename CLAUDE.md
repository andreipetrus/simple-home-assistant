# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the DogeAssistant project.

## Project Overview

**DogeAssistant** is a comprehensive web dashboard application designed for home automation and family organization. It features widgets for calendar management, Sonos music control, and weather information, optimized specifically for Amazon Fire 7 tablet display (1024x600 landscape).

## Current Architecture

### Backend (Node.js/Express)
- **Express.js server** with API endpoints for widgets
- **Local Sonos integration** using UPnP (no OAuth required)
- **Calendar management** with iCal/ICS URL support
- **Configuration system** with persistent JSON storage
- **CORS proxy** for external calendar data fetching

### Frontend (Vanilla JavaScript)
- **Tab-based single-widget layout** optimized for Fire 7 tablet
- **Calendar widget** with two-column layout (agenda + month picker)
- **Sonos widget** with real-time music control
- **Weather widget placeholder** for future implementation
- **Responsive design** with tablet-first approach

### Key Features Implemented

#### Calendar System
- **Multi-calendar support** with iCal URL integration
- **Event deduplication** with source tracking
- **Configurable date ranges** (past weeks/future months)
- **Auto-scroll to today** functionality
- **Month navigation** with interactive date selection
- **Two-column layout**: date headers (left) + events (right)
- **Smart time formatting** with same-hour detection
- **Calendar picker** on right side for date navigation

#### Sonos Integration
- **Local network control** via UPnP (no cloud API)
- **Automatic device discovery** on local network
- **Real-time playback control** (play/pause/skip/volume)
- **Current track display** with artist/title
- **Multiple speaker support** with device selection

#### UI/UX Optimizations
- **Amazon Fire 7 specific** layout (1024x600 landscape)
- **Tab navigation** with status indicators
- **Auto-scroll consistency** across all interaction scenarios
- **Larger event time display** for better readability
- **Expanded calendar picker** with enhanced day cells
- **Focus management** with keyboard navigation
- **Accessibility features** with ARIA roles and labels

## Directory Structure

```
DogeAssistant/
├── server.js                 # Main Express server
├── package.json              # Dependencies and scripts
├── CLAUDE.md                 # This file - project guidance
├── README.md                 # Project documentation
├── assets/
│   ├── css/
│   │   ├── main.css          # Global styles & Fire 7 optimization
│   │   ├── widgets.css       # Widget-specific styles
│   │   └── admin.css         # Admin panel styles
│   ├── js/
│   │   ├── app.js           # Main application logic
│   │   ├── widget-manager.js # Widget management system
│   │   ├── admin.js         # Admin panel functionality
│   │   └── utils.js         # Shared utilities
│   └── libs/
│       └── ical.js          # Calendar parsing library
├── widgets/
│   ├── calendar/
│   │   └── calendar-widget.js # Calendar widget implementation
│   ├── weather/
│   │   ├── weather-widget.js  # Weather widget implementation
│   │   └── weather-widget.css # Weather-specific styles
│   └── sonos/
│       └── sonos-widget.js    # Sonos widget implementation
├── data/
│   ├── calendars.json        # Calendar configuration storage
│   └── config.json          # Application settings
├── tests/
│   └── calendar/            # Comprehensive calendar test suite
│       ├── calendar-suite.test.js      # Full E2E test coverage
│       ├── calendar-unit.test.js       # Unit tests
│       ├── calendar-integration.test.js # API integration tests
│       └── calendar-e2e-focus.test.js  # Current day focus tests
├── admin.html               # Management dashboard
├── index.html              # Main application
└── api/                    # Server API endpoints
    ├── calendars/          # Calendar CRUD operations
    ├── sonos/             # Sonos device control
    └── config/            # Configuration management
```

## Development Workflow

### Running the Application
```bash
npm start                    # Start development server on port 3000
```

### Testing
```bash
# Calendar-specific testing
npm run test:calendar:all    # Run all calendar tests (unit + integration + E2E)
npm run test:calendar:unit   # Unit tests only
npm run test:calendar:e2e    # E2E tests only
npm run test:calendar:comprehensive # Full test suite

# Weather-specific testing
npm run test:weather:all     # Run all weather tests (unit + integration + E2E)
npm run test:weather:unit    # Unit tests only
npm run test:weather:integration # API integration tests
npm run test:weather:e2e     # E2E tests only
npm run test:weather:comprehensive # Complete test suite

# General testing
npm test                     # Jest unit tests
npm run test:e2e            # Playwright E2E tests
npm run test:all            # All tests
npm run test:coverage       # Coverage report
```

### Key Configuration Files

#### Calendar Configuration
- **Location**: `data/config.json`
- **Settings**: 
  - `pastWeeks`: Number of weeks to show in the past (1-4)
  - `futureMonths`: Number of months to show in future (1-6)
- **Admin Panel**: Accessible at `/admin` for configuration changes

#### Calendar Data
- **Location**: `data/calendars.json`
- **Format**: Array of calendar objects with name, URL, enabled status
- **Management**: Add/edit/delete calendars via admin panel

## Technical Standards

### Code Style
- **Vanilla JavaScript** (ES5 compatible for broader device support)
- **Functional programming patterns** with object-based widgets
- **Progressive enhancement** approach
- **Mobile-first responsive design** (Fire 7 optimized)

### Performance Requirements
- **Fast loading**: Calendar must load within 5 seconds
- **Responsive auto-scroll**: Tab switching should complete in <200ms
- **Efficient rendering**: Handle large date ranges without performance degradation

### Testing Standards
- **Comprehensive coverage**: Unit, integration, and E2E tests
- **Real-world scenarios**: Test actual user workflows
- **Performance monitoring**: Measure and validate load times
- **Accessibility compliance**: ARIA roles and keyboard navigation

### Browser Support
- **Primary target**: Fire 7 tablet browser
- **Secondary**: Chrome, Firefox, Safari on tablets
- **No IE support** required

## Common Tasks

### Adding New Calendar Features
1. Update `widgets/calendar/calendar-widget.js`
2. Add corresponding CSS in `assets/css/widgets.css`
3. Create comprehensive tests in `tests/calendar/`
4. Update admin panel if configuration needed
5. Test on Fire 7 tablet dimensions (1024x600)

### Debugging Calendar Issues
1. Check browser console for JavaScript errors
2. Verify iCal URL accessibility via CORS proxy
3. Examine `data/calendars.json` for configuration issues
4. Use Playwright tests to validate user workflows
5. Check auto-scroll behavior across all scenarios

### Performance Optimization
1. Monitor initial load time (target: <5 seconds)
2. Optimize auto-scroll timing (target: <200ms)
3. Test with large date ranges (6+ months)
4. Validate memory usage with multiple calendars
5. Ensure smooth animations on tablet hardware

## Integration Points

### External Services
- **iCal/ICS URLs**: Google Calendar, Apple Calendar, Outlook
- **CORS Proxy**: `api.allorigins.win` for calendar data fetching
- **Local Sonos**: UPnP discovery and control on local network

### APIs
- `GET/POST /api/calendars` - Calendar CRUD operations
- `GET/POST /api/config` - Configuration management
- `GET /api/sonos/devices` - Sonos device discovery
- `POST /api/sonos/control` - Sonos playback control

## Known Limitations

1. **Infinite scroll**: Temporarily disabled due to duplicate element issues
2. **Weather widget**: Placeholder only, not implemented
3. **Mobile portrait**: Not optimized (landscape Fire 7 focus)
4. **Multiple timezones**: Basic support only
5. **Recurring events**: Basic ICAL.js parsing support

## Future Enhancements

1. **Weather integration** with location-based forecasts
2. **Smart home controls** integration
3. **Voice command** support for Sonos
4. **Calendar event creation** via admin panel
5. **Theme customization** for different tablets
6. **Backup/restore** functionality for configurations