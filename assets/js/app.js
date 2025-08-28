var App = {
    refreshInterval: null,
    activeTab: 'calendar',
    
    init: function() {
        this.loadConfig();
        this.setupRefreshInterval();
        this.setupTabNavigation();
        WidgetManager.init();
        this.updateLastRefresh();
    },
    
    loadConfig: function() {
        Utils.apiRequest('/api/config')
            .then(function(config) {
                if (config.refreshInterval) {
                    this.setupRefreshInterval(config.refreshInterval);
                }
                
                if (config.theme && config.theme !== 'light') {
                    this.applyTheme(config.theme);
                }
            }.bind(this))
            .catch(function(error) {
                console.error('Failed to load config:', error);
            });
    },
    
    setupRefreshInterval: function(interval) {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        interval = interval || 300000;
        
        this.refreshInterval = setInterval(function() {
            WidgetManager.refreshAllWidgets();
        }, interval);
    },
    
    applyTheme: function(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else if (theme === 'auto') {
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.body.classList.add('dark-theme');
            }
        }
    },
    
    setupTabNavigation: function() {
        var tabButtons = document.querySelectorAll('.tab-btn');
        var self = this;
        
        tabButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                var tabId = this.getAttribute('data-tab');
                self.switchTab(tabId);
            });
        });
        
        // Setup refresh button to only refresh active tab
        var refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                self.refreshActiveTab();
            });
        }
    },
    
    switchTab: function(tabId) {
        // Update active tab
        this.activeTab = tabId;
        
        // Update tab buttons
        var tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(function(button) {
            if (button.getAttribute('data-tab') === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update tab content
        var tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(function(content) {
            if (content.getAttribute('data-tab') === tabId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        // Update status indicator for calendar tab
        this.updateTabStatus(tabId);
        
        // Auto-scroll to today when Calendar tab is selected
        if (tabId === 'calendar') {
            setTimeout(function() {
                if (typeof CalendarWidget !== 'undefined' && CalendarWidget.scrollToToday) {
                    CalendarWidget.scrollToToday();
                }
            }, 200); // Small delay to ensure tab content is visible
        }
        
        // Refresh the active tab if needed
        this.refreshActiveTab();
    },
    
    updateTabStatus: function(tabId) {
        if (tabId === 'calendar') {
            var calendarTab = document.querySelector('[data-tab="calendar"]');
            if (calendarTab) {
                // Check if calendar widget is online
                var calendarWidget = document.getElementById('calendar-widget');
                if (calendarWidget) {
                    var statusElement = calendarWidget.querySelector('.widget-status');
                    var status = statusElement ? statusElement.textContent : 'Loading';
                    this.setTabStatusIndicator(calendarTab, status);
                }
            }
        }
    },
    
    setTabStatusIndicator: function(tabButton, status) {
        // Remove existing status indicators
        var existingIndicator = tabButton.querySelector('.tab-status');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Add new status indicator
        if (status && status !== 'Loading') {
            var indicator = document.createElement('span');
            indicator.className = 'tab-status tab-status-' + status.toLowerCase();
            indicator.textContent = status === 'Online' ? '●' : '○';
            tabButton.appendChild(indicator);
        }
    },
    
    refreshActiveTab: function() {
        var refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.classList.add('spinning');
            setTimeout(function() {
                refreshBtn.classList.remove('spinning');
            }, 1000);
        }
        
        // Refresh specific widget based on active tab
        if (this.activeTab === 'calendar') {
            WidgetManager.refreshWidget('Calendar').then(function() {
                // Auto-scroll to today after calendar refresh
                setTimeout(function() {
                    if (typeof CalendarWidget !== 'undefined' && CalendarWidget.scrollToToday) {
                        CalendarWidget.scrollToToday();
                    }
                }, 300);
            });
        } else if (this.activeTab === 'sonos') {
            WidgetManager.refreshWidget('Sonos');
        }
        
        this.updateLastRefresh();
    },

    updateLastRefresh: function() {
        var lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            var now = new Date();
            lastUpdated.textContent = 'Last updated: ' + Utils.formatTime(now);
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    App.init();
    
    var script = document.createElement('script');
    script.src = '/assets/libs/ical.js';
    script.onload = function() {
        console.log('ICAL.js library loaded');
    };
    script.onerror = function() {
        console.error('Failed to load ICAL.js library');
        Utils.showError('Failed to load calendar library');
    };
    document.head.appendChild(script);
});