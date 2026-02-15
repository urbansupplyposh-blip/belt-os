// API Bridge to connect Belt OS with real agents
class BeltAPI {
    constructor() {
        this.baseURL = 'http://localhost:8087'; // Waul's Brain endpoint
        this.agents = {
            waul: { endpoint: '/waul', model: 'kimi-k2.5:cloud', emoji: '🦊', color: '#f59e0b', costPer1K: 0.001 },
            bobby: { endpoint: '/bobby', model: 'llama3.2', emoji: '📊', color: '#3b82f6', costPer1K: 0 },
            maria: { endpoint: '/maria', model: 'llama3.2', emoji: '📝', color: '#ec4899', costPer1K: 0 },
            tim: { endpoint: '/tim', model: 'codex-5.2', emoji: '⚙️', color: '#10b981', costPer1K: 0.003 }
        };
        this.sessionHistory = [];
        this.maxRetries = 3;
        this.retryDelay = 1000; // Start with 1 second
        this.maxRetryDelay = 10000; // Max 10 seconds
        this.enableLogging = true;
        this.logBuffer = [];
        this.maxLogEntries = 100;
        
        // Load saved logs from localStorage
        this.loadLogs();
    }

    // Logging system
    log(level, message, data = null) {
        if (!this.enableLogging) return;
        
        const entry = {
            timestamp: new Date().toISOString(),
            level, // 'debug', 'info', 'warn', 'error'
            message,
            data,
            source: 'BeltAPI'
        };
        
        // Add to buffer
        this.logBuffer.unshift(entry);
        if (this.logBuffer.length > this.maxLogEntries) {
            this.logBuffer.pop();
        }
        
        // Save to localStorage
        this.saveLogs();
        
        // Also console log
        const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
        console[consoleMethod](`[BeltAPI ${level.toUpperCase()}] ${message}`, data || '');
        
        return entry;
    }
    
    saveLogs() {
        try {
            localStorage.setItem('beltos_api_logs', JSON.stringify(this.logBuffer));
        } catch (e) {
            console.warn('Failed to save API logs:', e);
        }
    }
    
    loadLogs() {
        try {
            const saved = localStorage.getItem('beltos_api_logs');
            if (saved) {
                this.logBuffer = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load API logs:', e);
        }
    }
    
    getLogs(level = null, limit = 50) {
        let logs = this.logBuffer;
        if (level) {
            logs = logs.filter(l => l.level === level);
        }
        return logs.slice(0, limit);
    }
    
    clearLogs() {
        this.logBuffer = [];
        localStorage.removeItem('beltos_api_logs');
    }

    // Exponential backoff retry logic
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    calculateRetryDelay(attempt) {
        // Exponential backoff with jitter
        const delay = Math.min(this.retryDelay * Math.pow(2, attempt), this.maxRetryDelay);
        const jitter = Math.random() * 1000; // Add up to 1s of jitter
        return delay + jitter;
    }

    async checkStatus() {
        this.log('debug', 'Checking agent status...');
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
            
            const response = await fetch(`${this.baseURL}/status`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.log('info', 'Agent status check successful', { agents: data.agents });
            return data;
        } catch (e) {
            this.log('error', 'Agent status check failed', { error: e.message });
            return { status: 'offline', agents: [], error: e.message };
        }
    }

    async sendMessage(agent, message, context = {}, options = {}) {
        const agentConfig = this.agents[agent];
        if (!agentConfig) {
            const error = new Error(`Unknown agent: ${agent}`);
            this.log('error', error.message);
            throw error;
        }

        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        
        // Log the request
        this.log('info', `Sending message to ${agent}`, { 
            requestId, 
            agent, 
            messagePreview: message.slice(0, 100),
            context: Object.keys(context)
        });

        let lastError = null;
        
        // Retry loop
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutMs = options.timeout || 30000; // 30s default timeout
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                
                const requestBody = { 
                    message, 
                    context,
                    requestId,
                    timestamp: new Date().toISOString()
                };
                
                const response = await fetch(`${this.baseURL}${agentConfig.endpoint}`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Request-ID': requestId,
                        'X-Attempt': (attempt + 1).toString()
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                const duration = Date.now() - startTime;
                
                // Calculate cost based on tokens
                const tokens = data.tokens || 0;
                const cost = (tokens / 1000) * agentConfig.costPer1K;
                
                // Record session
                const session = {
                    id: requestId,
                    agent,
                    message: message.slice(0, 200),
                    response: data.response?.slice(0, 200),
                    timestamp: new Date().toISOString(),
                    duration,
                    tokens,
                    cost,
                    attempts: attempt + 1,
                    status: 'success'
                };
                this.sessionHistory.unshift(session);
                if (this.sessionHistory.length > 50) this.sessionHistory.pop();
                
                // Log success
                this.log('info', `Message to ${agent} successful`, { 
                    requestId, 
                    duration, 
                    tokens, 
                    cost,
                    attempts: attempt + 1 
                });
                
                // Update cost tracking if available
                if (window.costMonitor) {
                    window.costMonitor.recordCall(agent, tokens);
                }
                
                return { 
                    ...data, 
                    session,
                    metadata: {
                        requestId,
                        duration,
                        tokens,
                        cost,
                        attempts: attempt + 1,
                        timestamp: new Date().toISOString()
                    }
                };
                
            } catch (e) {
                lastError = e;
                const isRetryable = e.name === 'TypeError' || // Network errors
                                   e.name === 'AbortError' || // Timeout
                                   (e.message && e.message.includes('HTTP 5')); // Server errors
                
                if (attempt < this.maxRetries && isRetryable) {
                    const delay = this.calculateRetryDelay(attempt);
                    this.log('warn', `Request to ${agent} failed (attempt ${attempt + 1}/${this.maxRetries + 1}), retrying in ${delay}ms...`, { 
                        error: e.message,
                        requestId
                    });
                    await this.sleep(delay);
                } else {
                    break;
                }
            }
        }
        
        // All retries exhausted
        const duration = Date.now() - startTime;
        this.log('error', `All retries failed for ${agent}`, { 
            requestId, 
            error: lastError?.message,
            duration,
            attempts: this.maxRetries + 1
        });
        
        // Record failed session
        const failedSession = {
            id: requestId,
            agent,
            message: message.slice(0, 200),
            timestamp: new Date().toISOString(),
            duration,
            tokens: 0,
            cost: 0,
            attempts: this.maxRetries + 1,
            status: 'failed',
            error: lastError?.message
        };
        this.sessionHistory.unshift(failedSession);
        
        return { 
            error: lastError?.message || 'Request failed', 
            agent, 
            offline: true,
            metadata: {
                requestId,
                duration,
                attempts: this.maxRetries + 1,
                timestamp: new Date().toISOString()
            }
        };
    }

    async teamTask(task, context = {}, options = {}) {
        this.log('info', 'Initiating team task', { task: task.slice(0, 100), agents: Object.keys(this.agents) });
        
        // Send to all agents concurrently
        const promises = Object.keys(this.agents).map(async agent => {
            try {
                const res = await this.sendMessage(agent, task, context, options);
                return { agent, ...res };
            } catch (e) {
                this.log('error', `Team task failed for ${agent}`, { error: e.message });
                return { agent, error: e.message, offline: true };
            }
        });
        
        const responses = await Promise.allSettled(promises);
        
        // Process results
        const results = responses.map((result, index) => {
            const agent = Object.keys(this.agents)[index];
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return { agent, error: result.reason?.message || 'Unknown error', offline: true };
            }
        });
        
        // Log team task completion
        const successful = results.filter(r => !r.error).length;
        this.log('info', 'Team task completed', { 
            total: results.length, 
            successful, 
            failed: results.length - successful 
        });
        
        return results;
    }

    getSessionHistory(agent = null, limit = 50) {
        let sessions = this.sessionHistory;
        if (agent) {
            sessions = sessions.filter(s => s.agent === agent);
        }
        return sessions.slice(0, limit);
    }
    
    clearSessionHistory() {
        this.sessionHistory = [];
        this.log('info', 'Session history cleared');
    }

    // Real-time polling for active sessions
    startPolling(callback, interval = 5000) {
        this.log('info', 'Starting status polling', { interval });
        
        const poll = async () => {
            try {
                const status = await this.checkStatus();
                callback(status);
            } catch (e) {
                this.log('warn', 'Polling error', { error: e.message });
                callback({ status: 'error', error: e.message });
            }
        };
        
        // Initial poll
        poll();
        
        // Set up interval
        return setInterval(poll, interval);
    }
    
    stopPolling(handle) {
        clearInterval(handle);
        this.log('info', 'Status polling stopped');
    }
    
    // Test the API connection
    async testConnection(agent = 'waul') {
        this.log('info', `Testing connection to ${agent}`);
        const result = await this.sendMessage(agent, 'ping', {}, { timeout: 10000 });
        const success = !result.error;
        this.log(success ? 'info' : 'error', `Connection test ${success ? 'successful' : 'failed'}`, { agent, result: success });
        return { success, agent, result };
    }
    
    // Get API health report
    getHealthReport() {
        const total = this.sessionHistory.length;
        const successful = this.sessionHistory.filter(s => s.status === 'success').length;
        const failed = this.sessionHistory.filter(s => s.status === 'failed').length;
        const totalCost = this.sessionHistory.reduce((sum, s) => sum + (s.cost || 0), 0);
        
        return {
            totalSessions: total,
            successful,
            failed,
            successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
            totalCost: totalCost.toFixed(4),
            recentErrors: this.getLogs('error', 5),
            agents: Object.keys(this.agents).map(agent => ({
                name: agent,
                ...this.agents[agent],
                sessions: this.sessionHistory.filter(s => s.agent === agent).length
            }))
        };
    }
}

// GitHub integration for the Overnight Log
class GitHubIntegration {
    constructor() {
        this.cache = [];
        this.lastFetch = null;
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    }

    async getRecentCommits(repo = 'belt-os', limit = 10) {
        const now = Date.now();
        if (this.lastFetch && (now - this.lastFetch < this.cacheTTL) && this.cache.length > 0) {
            return this.cache.slice(0, limit);
        }
        
        try {
            const response = await fetch(`https://api.github.com/repos/urbansupplyposh-blip/${repo}/commits?per_page=${limit}`, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const commits = await response.json();
            
            this.cache = commits.map(c => ({
                id: c.sha.slice(0, 7),
                message: c.commit.message.split('\n')[0],
                author: c.commit.author.name,
                date: c.commit.author.date,
                avatar: c.author?.avatar_url
            }));
            
            this.lastFetch = now;
            return this.cache.slice(0, limit);
        } catch (e) {
            console.warn('Failed to fetch commits:', e);
            return [];
        }
    }

    async getRepoStats() {
        try {
            const response = await fetch('https://api.github.com/repos/urbansupplyposh-blip/belt-os', {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                stars: data.stargazers_count,
                forks: data.forks_count,
                issues: data.open_issues_count,
                updated: data.updated_at,
                url: data.html_url
            };
        } catch (e) {
            console.warn('Failed to fetch repo stats:', e);
            return null;
        }
    }
}

// iMessage integration for notifications
class iMessageBridge {
    constructor() {
        this.unreadCount = 0;
        this.lastCheck = null;
    }

    async checkMessages() {
        // In a real implementation, this would check via the API
        // For now, simulate with localStorage
        const saved = localStorage.getItem('beltos_imessage');
        const data = saved ? JSON.parse(saved) : { unread: 0, messages: [] };
        this.unreadCount = data.unread;
        this.lastCheck = new Date().toISOString();
        return data;
    }
    
    async sendMessage(to, message) {
        // This would integrate with BlueBubbles API
        console.log(`[iMessage] Would send to ${to}: ${message}`);
        return { success: true, to, message };
    }

    renderNotificationBadge() {
        const el = document.getElementById('imessage-badge');
        if (el && this.unreadCount > 0) {
            el.textContent = this.unreadCount;
            el.style.display = 'flex';
        }
    }
}

// Export
window.BeltAPI = BeltAPI;
window.GitHubIntegration = GitHubIntegration;
window.iMessageBridge = iMessageBridge;
