var Utils = {
    apiRequest: function(url, options) {
        options = options || {};
        var defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Merge the options
        var finalOptions = this.extend(defaultOptions, options);
        
        // Handle body for non-GET requests
        if (finalOptions.method && finalOptions.method !== 'GET' && finalOptions.body) {
            finalOptions.body = typeof finalOptions.body === 'string' 
                ? finalOptions.body 
                : JSON.stringify(finalOptions.body);
        }
        
        return fetch(url, finalOptions)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.status);
                }
                return response.json();
            });
    },
    
    extend: function(target, source) {
        var extended = {};
        var prop;
        for (prop in target) {
            if (target.hasOwnProperty(prop)) {
                extended[prop] = target[prop];
            }
        }
        for (prop in source) {
            if (source.hasOwnProperty(prop)) {
                extended[prop] = source[prop];
            }
        }
        return extended;
    },
    
    formatTime: function(date) {
        if (!date) return '';
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return hours + ':' + minutes + ' ' + ampm;
    },
    
    formatDate: function(date) {
        if (!date) return '';
        var today = new Date();
        var tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (this.isSameDay(date, today)) {
            return 'Today';
        } else if (this.isSameDay(date, tomorrow)) {
            return 'Tomorrow';
        } else {
            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months[date.getMonth()] + ' ' + date.getDate();
        }
    },
    
    isSameDay: function(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    },
    
    showError: function(message) {
        var errorToast = document.getElementById('errorToast');
        var errorMessage = document.getElementById('errorMessage');
        var errorClose = document.getElementById('errorClose');
        
        if (errorToast && errorMessage) {
            errorMessage.textContent = message;
            errorToast.classList.add('show');
            
            setTimeout(function() {
                errorToast.classList.remove('show');
            }, 5000);
            
            if (errorClose) {
                errorClose.onclick = function() {
                    errorToast.classList.remove('show');
                };
            }
        }
    },
    
    createElement: function(tagName, className, textContent) {
        var element = document.createElement(tagName);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    },
    
    debounce: function(func, wait) {
        var timeout;
        return function executedFunction() {
            var context = this;
            var args = arguments;
            var later = function() {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};