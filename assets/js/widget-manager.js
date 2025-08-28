var WidgetManager = {
    widgets: [],
    container: null,
    
    init: function() {
        this.container = document.getElementById('singleWidgetView');
        this.loadWidgets();
        this.setupEventListeners();
    },
    
    setupEventListeners: function() {
        var refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.refreshAllWidgets.bind(this));
        }
    },
    
    registerWidget: function(widget) {
        if (widget && widget.name && widget.render) {
            this.widgets.push(widget);
        }
    },
    
    loadWidgets: function() {
        var self = this;
        if (!this.container) return;
        
        if (this.widgets.length === 0) {
            return;
        }
        
        this.widgets.forEach(function(widget) {
            // Map widgets to their respective tabs
            var tabId = self.getTabForWidget(widget.name);
            var tabContent = document.getElementById(tabId + 'Tab');
            
            if (tabContent) {
                var widgetElement = self.createWidgetElement(widget);
                tabContent.innerHTML = ''; // Clear loading content
                tabContent.appendChild(widgetElement);
                
                if (widget.init) {
                    widget.init();
                }
            }
        });
        
        this.updateLastRefresh();
    },
    
    getTabForWidget: function(widgetName) {
        // Map widget names to tab IDs
        switch(widgetName.toLowerCase()) {
            case 'calendar':
                return 'calendar';
            case 'sonos':
                return 'sonos';
            case 'weather':
                return 'weather';
            default:
                return 'calendar'; // Default tab
        }
    },
    
    createWidgetElement: function(widget) {
        var element = document.createElement('div');
        element.className = 'widget';
        element.id = widget.name.toLowerCase() + '-widget';
        
        // Skip header for calendar widget (status moved to tab)
        if (widget.name.toLowerCase() !== 'calendar') {
            var header = Utils.createElement('div', 'widget-header');
            var title = Utils.createElement('h2', 'widget-title');
            title.innerHTML = (widget.icon || '') + ' ' + widget.name;
            
            var status = Utils.createElement('span', 'widget-status loading', 'Loading');
            
            header.appendChild(title);
            header.appendChild(status);
            
            element.appendChild(header);
        }
        
        var content = Utils.createElement('div', 'widget-content');
        content.innerHTML = widget.render();
        
        element.appendChild(content);
        
        return element;
    },
    
    updateWidgetStatus: function(widgetName, status) {
        var widget = document.getElementById(widgetName.toLowerCase() + '-widget');
        if (widget) {
            var statusElement = widget.querySelector('.widget-status');
            if (statusElement) {
                statusElement.className = 'widget-status ' + status.toLowerCase();
                statusElement.textContent = status;
            }
        }
    },
    
    updateWidgetContent: function(widgetName, content) {
        var widget = document.getElementById(widgetName.toLowerCase() + '-widget');
        if (widget) {
            var contentElement = widget.querySelector('.widget-content');
            if (contentElement) {
                if (typeof content === 'string') {
                    contentElement.innerHTML = content;
                } else {
                    contentElement.innerHTML = '';
                    contentElement.appendChild(content);
                }
            }
        }
    },
    
    showWidgetError: function(widgetName, error) {
        var errorHtml = '<div class="widget-error">' +
                       '<div class="error-icon">⚠️</div>' +
                       '<div class="error-message">Failed to load widget</div>' +
                       '<div class="error-details">' + (error.message || error) + '</div>' +
                       '</div>';
        
        this.updateWidgetContent(widgetName, errorHtml);
        this.updateWidgetStatus(widgetName, 'Offline');
    },
    
    refreshAllWidgets: function() {
        var refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.classList.add('spinning');
        }
        
        var refreshPromises = this.widgets.map(function(widget) {
            if (widget.refresh) {
                return widget.refresh().catch(function(error) {
                    console.error('Widget refresh failed:', widget.name, error);
                    return Promise.resolve();
                });
            }
            return Promise.resolve();
        });
        
        var self = this;
        Promise.all(refreshPromises).finally(function() {
            if (refreshBtn) {
                refreshBtn.classList.remove('spinning');
            }
            self.updateLastRefresh();
        });
    },
    
    refreshWidget: function(widgetName) {
        var widget = this.widgets.find(function(w) {
            return w.name === widgetName;
        });
        
        if (widget && widget.refresh) {
            return widget.refresh();
        }
        
        return Promise.resolve();
    },

    updateLastRefresh: function() {
        var lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            var now = new Date();
            lastUpdated.textContent = 'Last updated: ' + Utils.formatTime(now);
        }
    }
};