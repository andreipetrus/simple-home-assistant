var CalendarWidget = {
    name: 'Calendar',
    icon: '📅',
    calendars: [],
    events: [],
    
    init: function() {
        var self = this;
        this.loadConfig()
            .then(function() {
                self.loadCalendars();
            })
            .catch(function(error) {
                console.log('Config load failed, using defaults');
                self.loadCalendars();
            });
    },
    
    loadConfig: function() {
        var self = this;
        return Utils.apiRequest('/api/config')
            .then(function(config) {
                var configChanged = false;
                if (config.calendar) {
                    var newPastWeeks = config.calendar.pastWeeks || 2;
                    var newFutureMonths = config.calendar.futureMonths || 3;
                    
                    if (self.config.pastWeeks !== newPastWeeks || self.config.futureMonths !== newFutureMonths) {
                        configChanged = true;
                    }
                    
                    self.config.pastWeeks = newPastWeeks;
                    self.config.futureMonths = newFutureMonths;
                }
                console.log('Calendar config loaded:', self.config);
                
                // If config changed and we already have calendars loaded, refresh data
                if (configChanged && self.calendars.length > 0) {
                    console.log('Calendar configuration changed, refreshing data...');
                    self.refresh();
                }
            })
            .catch(function(error) {
                console.log('Using default calendar configuration');
                // Return resolved promise so chain continues
                return Promise.resolve();
            });
    },
    
    // Method to reload config and refresh data (can be called from admin panel)
    reloadConfig: function() {
        return this.loadConfig();
    },
    
    render: function() {
        return '<div class="calendar-widget">' +
               '<div class="no-events">Loading calendar events...</div>' +
               '</div>';
    },
    
    loadCalendars: function() {
        var self = this;
        Utils.apiRequest('/api/calendars')
            .then(function(calendars) {
                self.calendars = calendars.filter(function(cal) {
                    return cal.enabled !== false;
                });
                
                if (self.calendars.length > 0) {
                    // Start refreshing calendar data after calendars are loaded
                    self.refresh();
                } else {
                    WidgetManager.updateWidgetContent('Calendar', 
                        '<div class="no-events">No calendars configured</div>'
                    );
                    WidgetManager.updateWidgetStatus('Calendar', 'Online');
                }
            })
            .catch(function(error) {
                console.error('Failed to load calendars:', error);
                WidgetManager.showWidgetError('Calendar', error);
            });
    },
    
    refresh: function() {
        if (this.calendars.length === 0) {
            this.loadCalendars();
            return Promise.resolve();
        }
        
        WidgetManager.updateWidgetStatus('Calendar', 'Loading');
        
        var fetchPromises = this.calendars.map(this.fetchCalendarData.bind(this));
        var self = this;
        
        return Promise.allSettled(fetchPromises)
            .then(function(results) {
                var allEvents = [];
                
                results.forEach(function(result, index) {
                    if (result.status === 'fulfilled') {
                        allEvents = allEvents.concat(result.value);
                    } else {
                        console.error('Failed to fetch calendar:', self.calendars[index].name, result.reason);
                    }
                });
                
                self.events = self.deduplicateEvents(allEvents);
                self.renderEvents();
                WidgetManager.updateWidgetStatus('Calendar', 'Online');
            })
            .catch(function(error) {
                console.error('Calendar refresh failed:', error);
                WidgetManager.showWidgetError('Calendar', error);
            });
    },
    
    fetchCalendarData: function(calendar) {
        var corsProxy = 'https://api.allorigins.win/get?url=';
        var url = corsProxy + encodeURIComponent(calendar.url);
        
        return fetch(url)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                var icalData = data.contents;
                
                // Handle base64 encoded data from some sources
                if (icalData.startsWith('data:text/calendar')) {
                    var base64Data = icalData.split(',')[1];
                    icalData = atob(base64Data);
                }
                
                return this.parseICalData(icalData, calendar);
            }.bind(this));
    },
    
    parseICalData: function(icalData, calendar) {
        try {
            if (typeof ICAL === 'undefined') {
                console.error('ICAL library not loaded');
                return [];
            }
            
            var jcalData = ICAL.parse(icalData);
            var comp = new ICAL.Component(jcalData);
            var vevents = comp.getAllSubcomponents('vevent');
            
            var events = [];
            var now = new Date();
            
            // Calculate date range based on configuration
            var startRange = new Date(now);
            startRange.setDate(startRange.getDate() - (this.config.pastWeeks * 7));
            
            var endRange = new Date(now);
            endRange.setMonth(endRange.getMonth() + this.config.futureMonths);
            
            vevents.forEach(function(vevent) {
                var event = new ICAL.Event(vevent);
                var startDate = event.startDate ? event.startDate.toJSDate() : null;
                
                if (startDate && startDate >= startRange && startDate <= endRange) {
                    events.push({
                        id: event.uid || Math.random().toString(36),
                        title: event.summary || 'Untitled Event',
                        startTime: startDate,
                        endTime: event.endDate ? event.endDate.toJSDate() : null,
                        location: event.location || '',
                        description: event.description || '',
                        calendar: calendar.name,
                        allDay: event.isRecurring() ? false : (event.startDate && !event.startDate.isDate ? false : true)
                    });
                }
            });
            
            return events;
        } catch (error) {
            console.error('Failed to parse iCal data:', error);
            return [];
        }
    },
    
    deduplicateEvents: function(events) {
        var eventMap = {};
        var deduplicated = [];
        
        events.forEach(function(event) {
            var key = event.title.toLowerCase() + '_' + event.startTime.getTime();
            
            if (!eventMap[key]) {
                // First occurrence - create event with calendar sources array
                event.calendarSources = [event.calendar];
                eventMap[key] = event;
                deduplicated.push(event);
            } else {
                // Duplicate event - add calendar source if not already present
                if (eventMap[key].calendarSources.indexOf(event.calendar) === -1) {
                    eventMap[key].calendarSources.push(event.calendar);
                }
            }
        });
        
        deduplicated.sort(function(a, b) {
            return a.startTime.getTime() - b.startTime.getTime();
        });
        
        return deduplicated;
    },
    
    selectedDate: new Date(),
    loadedEvents: [],
    isLoading: false,
    scrollContainer: null,
    currentCalendarMonth: new Date(), // Track current month in calendar picker
    
    // Configurable scroll ranges
    config: {
        pastWeeks: 2,
        futureMonths: 3
    },
    
    renderEvents: function() {
        // Prepare events by date for the new two-column layout
        var eventsByDate = this.groupEventsByDate(this.events);
        var html = this.renderCalendarList(eventsByDate);
        
        WidgetManager.updateWidgetContent('Calendar', html);
        
        // Initialize scroll container and virtualization after render
        this.initializeScrollContainer();
        
        // Auto-scroll to today after a short delay to ensure DOM is ready
        setTimeout(this.scrollToToday.bind(this), 100);
        
        // Also scroll to today on page reload if calendar tab is active
        if (typeof App !== 'undefined' && App.activeTab === 'calendar') {
            setTimeout(this.scrollToToday.bind(this), 500);
        }
    },
    
    groupEventsByDate: function(events, extendFuture, extendPast) {
        var grouped = {};
        var now = new Date();
        
        // Create date range based on extension parameters
        var startDate = new Date(now);
        var endDate = new Date(now);
        
        if (extendPast) {
            startDate.setDate(startDate.getDate() - ((this.config.pastWeeks * 7) + (extendPast * 14))); // Extend past by weeks
        } else {
            startDate.setDate(startDate.getDate() - (this.config.pastWeeks * 7));
        }
        
        if (extendFuture) {
            endDate.setMonth(endDate.getMonth() + (this.config.futureMonths + extendFuture)); // Extend future by months
        } else {
            endDate.setMonth(endDate.getMonth() + this.config.futureMonths);
        }
        
        // Initialize all dates in range
        var currentDate = new Date(startDate);
        var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        while (currentDate <= endDate) {
            // Use local date components instead of UTC to avoid timezone offset issues
            var year = currentDate.getFullYear();
            var month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
            var day = ('0' + currentDate.getDate()).slice(-2);
            var dateKey = year + '-' + month + '-' + day;
            var currentDateStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            
            grouped[dateKey] = {
                date: new Date(currentDate),
                events: [],
                isPast: currentDateStart < todayStart
            };
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Add events to their respective dates
        events.forEach(function(event) {
            // Use local date components instead of UTC to avoid timezone offset issues
            var date = event.startTime;
            var year = date.getFullYear();
            var month = ('0' + (date.getMonth() + 1)).slice(-2);
            var day = ('0' + date.getDate()).slice(-2);
            var dateKey = year + '-' + month + '-' + day;
            
            if (grouped[dateKey]) {
                grouped[dateKey].events.push(event);
            }
        });
        
        return grouped;
    },
    
    renderCalendarList: function(eventsByDate) {
        var html = '<div class="calendar-container">';
        
        // Left side - Events list
        html += '<div class="calendar-events-panel">';
        html += '<div class="calendar-list-container" tabindex="0" role="region" aria-label="Calendar events">';
        html += '<div class="calendar-list" role="list">';
        
        var dateKeys = Object.keys(eventsByDate).sort();
        var now = new Date();
        
        dateKeys.forEach(function(dateKey) {
            var dateData = eventsByDate[dateKey];
            var isToday = this.isToday(dateData.date);
            var isPast = dateData.isPast;
            
            html += '<div class="date-group' + (isPast ? ' past-date' : '') + (isToday ? ' today-date' : '') + '" role="listitem"';
            html += ' data-date="' + dateKey + '"';
            if (isToday) {
                html += ' id="today-group"';
            }
            html += '>';
            
            // Date header (left column)
            html += '<div class="date-header">';
            html += '<div class="date-label">' + this.formatDateHeader(dateData.date) + '</div>';
            html += this.getDateAccentDot(dateData);
            html += '</div>';
            
            // Events column (right)
            html += '<div class="date-events">';
            
            if (dateData.events.length === 0) {
                html += '<div class="empty-date" aria-label="No events">No events</div>';
            } else {
                dateData.events.forEach(function(event, index) {
                    html += this.renderEventRow(event, isPast, index);
                }.bind(this));
            }
            
            html += '</div>';
            html += '</div>';
        }.bind(this));
        
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Right side - Calendar picker
        html += '<div class="calendar-picker-panel">';
        html += this.renderMonthCalendar();
        html += '</div>';
        
        html += '</div>';
        
        return html;
    },
    
    formatDateHeader: function(date) {
        var now = new Date();
        var tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (this.isToday(date)) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return weekdays[date.getDay()] + ' ' + months[date.getMonth()] + ' ' + date.getDate();
        }
    },
    
    getDateAccentDot: function(dateData) {
        // Get unique calendar sources for this date
        var sources = new Set();
        dateData.events.forEach(function(event) {
            if (event.calendarSources) {
                event.calendarSources.forEach(function(source) {
                    sources.add(source);
                });
            }
        });
        
        if (sources.size === 0) return '';
        
        // Use first source for dot color
        var firstSource = Array.from(sources)[0];
        var dotColor = this.getCalendarColor(firstSource);
        
        return '<span class="date-accent-dot" style="background-color: ' + dotColor + '" aria-hidden="true"></span>';
    },
    
    getCalendarColor: function(calendarName) {
        // Assign colors based on calendar name
        var colors = {
            'USA Federal Holidays': '#ef4444',
            'UK Bank Holidays': '#3b82f6',
            'Andrei\'s': '#10b981',
            'Personal': '#8b5cf6',
            'Work': '#f59e0b'
        };
        return colors[calendarName] || '#6b7280';
    },
    
    renderEventRow: function(event, isPast, index) {
        var isAllDay = event.allDay || this.isFullDayEvent(event);
        var timeText = this.formatEventTime(event, isAllDay);
        
        var html = '<div class="event-row' + (isPast ? ' past-event' : '') + '" ';
        html += 'role="button" tabindex="' + (isPast ? '-1' : '0') + '" ';
        html += 'aria-label="' + event.title + (event.location ? ' at ' + event.location : '') + '">';
        
        // Time column
        html += '<div class="event-time">' + timeText + '</div>';
        
        // Event details column
        html += '<div class="event-details">';
        html += '<div class="event-title">' + event.title + '</div>';
        
        if (event.location) {
            html += '<div class="event-location">' + event.location + '</div>';
        }
        
        // Calendar source chips
        if (event.calendarSources && event.calendarSources.length > 0) {
            html += '<div class="calendar-chips">';
            event.calendarSources.sort().forEach(function(source) {
                var chipColor = this.getCalendarColor(source);
                html += '<span class="calendar-chip" style="border-color: ' + chipColor + '">' + source + '</span>';
            }.bind(this));
            html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
        
        return html;
    },
    
    formatEventTime: function(event, isAllDay) {
        if (isAllDay) return '';
        
        var startTime = this.formatTime12Hour(event.startTime);
        var endTime = event.endTime ? this.formatTime12Hour(event.endTime) : null;
        
        if (!endTime) return startTime;
        
        // If same hour, show start time only
        if (event.startTime.getHours() === event.endTime.getHours()) {
            return startTime;
        }
        
        return startTime + ' to ' + endTime;
    },
    
    formatTime12Hour: function(date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'p' : 'a';
        
        hours = hours % 12;
        hours = hours ? hours : 12;
        
        var minutesStr = minutes < 10 ? '0' + minutes : minutes.toString();
        
        return hours + ':' + minutesStr + ' ' + ampm;
    },
    
    isToday: function(date) {
        var now = new Date();
        return date.toDateString() === now.toDateString();
    },
    
    initializeScrollContainer: function() {
        var container = document.querySelector('.calendar-list-container');
        if (!container) return;
        
        this.scrollContainer = container;
        
        // Add keyboard navigation
        container.addEventListener('keydown', this.handleKeyNavigation.bind(this));
        
        // Add focus management
        this.setupFocusManagement();
        
        // Add infinite scroll
        this.setupInfiniteScroll();
    },
    
    scrollToToday: function() {
        if (!this.scrollContainer) return;
        
        // Use querySelector to get only the first today-group (in case of duplicates)
        var todayGroup = this.scrollContainer.querySelector('#today-group');
        if (todayGroup) {
            // Calculate the position relative to the scroll container
            var containerTop = this.scrollContainer.scrollTop;
            var todayOffset = todayGroup.offsetTop;
            var targetScroll = Math.max(0, todayOffset - 100); // 100px from top, but not negative
            
            this.scrollContainer.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
            
            console.log('Scrolled to today:', { currentScroll: containerTop, targetScroll, todayOffset });
        } else {
            console.log('Today group not found for scrolling');
        }
    },
    
    setupInfiniteScroll: function() {
        var self = this;
        var loadingThreshold = 100; // Load more when within 100px of bottom/top
        
        this.scrollContainer.addEventListener('scroll', function() {
            var scrollTop = this.scrollTop;
            var scrollHeight = this.scrollHeight;
            var clientHeight = this.clientHeight;
            
            // Check if near bottom - load future dates
            if (scrollHeight - scrollTop - clientHeight < loadingThreshold) {
                self.loadMoreFutureDates();
            }
            
            // Check if near top - load past dates
            if (scrollTop < loadingThreshold) {
                self.loadMorePastDates();
            }
        });
    },
    
    loadMoreFutureDates: function() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        // For now, disable infinite scroll to fix duplicate elements issue
        // TODO: Implement proper incremental loading
        console.log('Future dates loading temporarily disabled');
        this.isLoading = false;
    },
    
    loadMorePastDates: function() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        // For now, disable infinite scroll to fix duplicate elements issue
        // TODO: Implement proper incremental loading
        console.log('Past dates loading temporarily disabled');
        this.isLoading = false;
    },
    
    handleKeyNavigation: function(e) {
        var focusableElements = this.scrollContainer.querySelectorAll('.event-row[tabindex="0"]');
        var currentFocus = document.activeElement;
        var currentIndex = Array.from(focusableElements).indexOf(currentFocus);
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < focusableElements.length - 1) {
                    focusableElements[currentIndex + 1].focus();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    focusableElements[currentIndex - 1].focus();
                }
                break;
        }
    },
    
    setupFocusManagement: function() {
        var eventRows = this.scrollContainer.querySelectorAll('.event-row[tabindex="0"]');
        eventRows.forEach(function(row) {
            row.addEventListener('focus', function() {
                row.classList.add('focused');
            });
            row.addEventListener('blur', function() {
                row.classList.remove('focused');
            });
        });
    },
    
    isFullDayEvent: function(event) {
        if (!event.startTime || !event.endTime) return false;
        
        var start = new Date(event.startTime);
        var end = new Date(event.endTime);
        
        // Check if it's exactly 12:00 AM to 12:00 AM (24 hour event)
        return (start.getHours() === 0 && start.getMinutes() === 0 &&
                end.getHours() === 0 && end.getMinutes() === 0 &&
                (end.getTime() - start.getTime()) === 24 * 60 * 60 * 1000);
    },
    
    getEventsForDisplay: function() {
        // For now, show upcoming week events
        // TODO: Filter by selected date when month calendar is implemented
        return this.events;
    },
    
    renderMonthCalendar: function() {
        var now = new Date();
        var currentMonth = this.currentCalendarMonth.getMonth();
        var currentYear = this.currentCalendarMonth.getFullYear();
        
        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
        
        var html = '<div class="month-calendar">';
        html += '<div class="month-header">';
        html += '<button class="month-nav prev" onclick="CalendarWidget.previousMonth()">‹</button>';
        html += '<h4>' + monthNames[currentMonth] + ' ' + currentYear + '</h4>';
        html += '<button class="month-nav next" onclick="CalendarWidget.nextMonth()">›</button>';
        html += '</div>';
        
        // Calendar grid
        html += '<div class="calendar-grid">';
        
        // Day headers
        var dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(function(day) {
            html += '<div class="calendar-day-header">' + day + '</div>';
        });
        
        // Calendar days
        var firstDay = new Date(currentYear, currentMonth, 1);
        var lastDay = new Date(currentYear, currentMonth + 1, 0);
        var startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        for (var i = 0; i < 42; i++) {
            var date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            var isCurrentMonth = date.getMonth() === currentMonth;
            var isToday = date.toDateString() === now.toDateString();
            var hasEvents = this.hasEventsOnDate(date);
            
            var cssClass = 'calendar-day';
            if (!isCurrentMonth) cssClass += ' other-month';
            if (isToday) cssClass += ' today';
            if (hasEvents) cssClass += ' has-events';
            
            // Use local date components instead of UTC to avoid timezone offset issues
            var year = date.getFullYear();
            var month = ('0' + (date.getMonth() + 1)).slice(-2);
            var day = ('0' + date.getDate()).slice(-2);
            var dateStr = year + '-' + month + '-' + day;
            html += '<div class="' + cssClass + '" data-date="' + dateStr + '" onclick="CalendarWidget.selectDate(\'' + dateStr + '\')">';
            html += date.getDate();
            html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
        
        return html;
    },
    
    hasEventsOnDate: function(date) {
        var dateStr = date.toDateString();
        return this.events.some(function(event) {
            return event.startTime.toDateString() === dateStr;
        });
    },
    
    previousMonth: function() {
        this.currentCalendarMonth.setMonth(this.currentCalendarMonth.getMonth() - 1);
        this.updateCalendarPicker();
    },
    
    nextMonth: function() {
        this.currentCalendarMonth.setMonth(this.currentCalendarMonth.getMonth() + 1);
        this.updateCalendarPicker();
    },
    
    updateCalendarPicker: function() {
        var pickerPanel = document.querySelector('.calendar-picker-panel');
        if (pickerPanel) {
            pickerPanel.innerHTML = this.renderMonthCalendar();
        }
    },
    
    selectDate: function(dateStr) {
        this.selectedDate = new Date(dateStr);
        
        // Scroll to the selected date in the agenda view
        var dateGroup = document.querySelector('[data-date="' + dateStr + '"]');
        if (!dateGroup) {
            // If date not visible, we might need to expand the range
            // For now, just scroll to today as fallback
            this.scrollToToday();
        } else {
            var containerRect = this.scrollContainer.getBoundingClientRect();
            var dateRect = dateGroup.getBoundingClientRect();
            var offset = dateRect.top - containerRect.top - 100;
            
            this.scrollContainer.scrollBy({
                top: offset,
                behavior: 'smooth'
            });
        }
        
        // Update calendar picker to highlight selected date
        this.updateCalendarSelection(dateStr);
    },
    
    updateCalendarSelection: function(dateStr) {
        // Remove previous selection
        var previousSelection = document.querySelector('.calendar-day.selected');
        if (previousSelection) {
            previousSelection.classList.remove('selected');
        }
        
        // Add selection to new date
        var calendarDays = document.querySelectorAll('.calendar-day');
        calendarDays.forEach(function(day) {
            if (day.getAttribute('data-date') === dateStr) {
                day.classList.add('selected');
            }
        });
    }
};

if (typeof WidgetManager !== 'undefined') {
    WidgetManager.registerWidget(CalendarWidget);
}