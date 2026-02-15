// Enhanced API Bridge to connect Belt OS with real agents
// Includes error handling, retry logic, request/response logging, and cost tracking

class BeltAPI {
    constructor() {
        this.baseURL = 'http://localhost:8087'; // Waul's Brain endpoint
        this.agents = {
            waul: { 
                endpoint: '/waul', 
                model: 'kimi-k2.5:cloud', 
                emoji: '🦊', 
                color: '#f59e0b',
                costPer1K: 0.001
            },
            bobby: { 
                endpoint: '/bobby', 
                model: 'llama3.2', 
                emoji: '📊', 
                color: '#3b82f6',
                costPer1K: 0
            },
            maria: { 
                endpoint: '/maria', 
                model: 'llama3.2', 
                emoji: '📝', 
                color: '#ec4899',
                costPer1K: 0
            },
            tim: { 
                endpoint: '/tim', 
                model: 'codex-5.2', 
                emoji: '⚙️', 
                color: '#10b981',
                costPer1K: 0.003
            }
        };
        
        // Configuration
        this.config = {
            maxRetries: 3,
            retryDelay: 1000, // Initial retry delay in ms (doubles each retry)
            timeout: 30000,   // Request timeout in ms
            enableLogging: true,
            logLevel: 'debug' // 'debug', 'info', 'warn', 'error'
        };
        
        // Request/Response logs for debugging
        this.requestLogs = [];
        this.maxLogSize = 100;
        
        // Session history
        this.sessionHistory = [];
        this.maxSessionHistory = 50;
        
        // Online status cache
        this.statusCache = { lastCheck: null, status: null };
        this.statusCacheTTL = 5000; // 5 seconds
    }

    // Logging utility
    log(level, message, data = null) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        if (levels[level] >= levels[this.config.logLevel]) {
            const timestamp = new Date().toISOString();
            const logEntry = { timestamp, level, message, data };
            
            if (this.config.enableLogging) {
                console.log(`[BeltAPI ${level.toUpperCase()}] ${timestamp} - ${message}`, data || '');
            }
            
            // Store in request logs
            this.requestLogs.unshift(logEntry);
            if (this.requestLogs.length > this.maxLogSize) {
                this.requestLogs.pop();
            }
            
            return logEntry;
        }
    }

    // Get request logs (for debugging UI)
    getLogs(filter = null, limit = 50) {
        let logs = this.requestLogs;
        if (filter) {
            logs = logs.filter(l => 
                l.level === filter || 
                l.message.toLowerCase().includes(filter.toLowerCase())
            );
        }
        return logs.slice(0, limit);
    }

    // Clear logs
    clearLogs() {
        this.requestLogs = [];
        this.log('info', 'Request logs cleared');
    }

    // Retry logic wrapper
    async withRetry(operation, context = {}) {
        let lastError;
        let delay = this.config.retryDelay;
        
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                this.log('debug', `Attempt ${attempt}/${this.config.maxRetries}`, { context, attempt });
                const result = await Promise.race([
                    operation(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
                    )
                ]);
                
                if (attempt > 1) {
                    this.log('info', `Operation succeeded on attempt ${attempt}`, { context });
                }
                return { success: true, result, attempts: attempt };
            } catch (error) {
                lastError = error;
                this.log('warn', `Attempt ${attempt} failed`, { error: error.message, context });
                
                if (attempt < this.config.maxRetries) {
                    this.log('info', `Retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2; // Exponential backoff
                }
            }
        }
        
        this.log('error', `All ${this.config.maxRetries} attempts failed`, { error: lastError.message, context });
        return { success: false, error: lastError, attempts: this.config.maxRetries };
    }

    // Enhanced status check with caching
    async checkStatus(forceRefresh = false) {
        const now = Date.now();
        
        // Return cached status if valid
        if (!forceRefresh && this.statusCache.lastCheck && 
            (now - this.statusCache.lastCheck) < this.statusCacheTTL) {
            this.log('debug', 'Returning cached status', this.statusCache.status);
            return this.statusCache.status;
        }
        
        const result = await this.withRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                const response = await fetch(`${this.baseURL}/status`, {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (e) {
                clearTimeout(timeoutId);
                throw e;
            }
        }, { operation: 'checkStatus' });
        
        const status = result.success 
            ? { ...result.result, online: true, checkedAt: new Date().toISOString() }
            : { 
                status: 'offline', 
                agents: [], 
                online: false, 
                error: result.error?.message,
                checkedAt: new Date().toISOString()
              };
        
        this.statusCache = { lastCheck: now, status };
        this.log('info', `Status check: ${status.online ? 'online' : 'offline'}`, status);
        
        return status;
    }

    // Enhanced send message with full error handling and logging
    async sendMessage(agent, message, context = {}, options = {}) {
        const agentConfig = this.agents[agent];
        if (!agentConfig) {
            const error = new Error(`Unknown agent: ${agent}`);
            this.log('error', error.message);
            throw error;
        }

        const startTime = performance.now();
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const requestBody = { 
            message, 
            context,
            requestId,
            timestamp: new Date().toISOString()
        };
        
        // Log request
        this.log('info', `Sending message to ${agent}`, { 
            requestId, 
            agent, 
            messageLength: message.length,
            endpoint: agentConfig.endpoint 
        });
        
        this.log('debug', 'Request payload', requestBody);

        const result = await this.withRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            
            try {
                const response = await fetch(`${this.baseURL}${agentConfig.endpoint}`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Request-ID': requestId
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                // Handle HTTP errors
                if (!response.ok) {
                    let errorBody;
                    try {
                        errorBody = await response.json();
                    } catch {
                        errorBody = await response.text();
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${JSON.stringify(errorBody)}`);
                }
                
                const data = await response.json();
                return data;
            } catch (e) {
                clearTimeout(timeoutId);
                throw e;
            }
        }, { operation: 'sendMessage', agent, requestId });

        const duration = Math.round(performance.now() - startTime);
        
        if (!result.success) {
            this.log('error', `Failed to send message to ${agent}`, { 
                requestId, 
                error: result.error.message,
                duration 
            });
            
            // Record failed session
            const failedSession = {
                id: requestId,
                agent,
                message: message.slice(0, 100),
                response: null,
                timestamp: new Date().toISOString(),
                duration,
                tokens: 0,
                cost: 0,
                error: result.error.message,
                status: 'failed'
            };
            this.sessionHistory.unshift(failedSession);
            
            return { 
                error: result.error.message, 
                agent, 
                offline: true,
                requestId,
                session: failedSession
            };
        }

        const data = result.result;
        
        // Calculate cost
        const tokens = data.tokens || data.usage?.total_tokens || 
                       (data.usage?.prompt_tokens + data.usage?.completion_tokens) || 
                       this.estimateTokens(message, data.response);
        const cost = (tokens / 1000) * agentConfig.costPer1K;
        
        // Log response
        this.log('info', `Received response from ${agent}`, { 
            requestId, 
            duration, 
            tokens,
            cost: cost.toFixed(6),
            responseLength: data.response?.length || 0
        });
        
        this.log('debug', 'Response payload', data);
        
        // Record successful session
        const session = {
            id: requestId,
            agent,
            message: message.slice(0, 100),
            response: data.response?.slice(0, 100),
            fullResponse: data.response,
            timestamp: new Date().toISOString(),
            duration,
            tokens,
            cost,
            model: agentConfig.model,
            status: 'success',
            attempts: result.attempts
        };
        
        this.sessionHistory.unshift(session);
        if (this.sessionHistory.length > this.maxSessionHistory) {
            this.sessionHistory.pop();
        }
        
        // Update cost tracking if available
        if (window.BeltOS?.CostMonitor) {
            const costMonitor = new window.BeltOS.CostMonitor();
            costMonitor.recordCall(agent, tokens);
        }
        
        return { 
            ...data, 
            session,
            requestId,
            tokens,
            cost,
            duration,
            attempts: result.attempts
        };
    }

    // Send message to all agents (team task)
    async teamTask(task, context = {}, options = {}) {
        this.log('info', 'Starting team task', { task: task.slice(0, 100) });
        
        const responses = await Promise.allSettled(
            Object.keys(this.agents).map(async agent => {
                try {
                    const res = await this.sendMessage(agent, task, context, options);
                    return { agent, ...res };
                } catch (e) {
                    this.log('error', `Team task failed for ${agent}`, { error: e.message });
                    return { agent, error: e.message, offline: true };
                }
            })
        );
        
        const results = responses.map((result, index) => {
            const agent = Object.keys(this.agents)[index];
            if (result.status === 'fulfilled') {
                return result.value;
            }
            return { agent, error: result.reason?.message || 'Unknown error', offline: true };
        });
        
        const successCount = results.filter(r => !r.error).length;
        this.log('info', 'Team task complete', { 
            total: results.length, 
            successful: successCount,
            failed: results.length - successCount 
        });
        
        return results;
    }

    // Get session history
    getSessionHistory(agent = null, limit = 50) {
        let sessions = this.sessionHistory;
        if (agent) {
            sessions = sessions.filter(s => s.agent === agent);
        }
        return sessions.slice(0, limit);
    }

    // Clear session history
    clearSessionHistory() {
        this.sessionHistory = [];
        this.log('info', 'Session history cleared');
    }

    // Estimate tokens (fallback when API doesn't return token count)
    estimateTokens(input, output = '') {
        // Rough approximation: ~4 characters per token
        const totalChars = (input?.length || 0) + (output?.length || 0);
        return Math.ceil(totalChars / 4);
    }

    // Real-time polling for active sessions
    startPolling(callback, interval = 5000) {
        this.log('info', `Starting status polling (interval: ${interval}ms)`);
        
        const poll = async () => {
            const status = await this.checkStatus();
            callback(status);
        };
        
        // Immediate first check
        poll();
        
        return setInterval(poll, interval);
    }

    // Stop polling
    stopPolling(handle) {
        clearInterval(handle);
        this.log('info', 'Status polling stopped');
    }

    // Test connection to all agents
    async testConnections() {
        this.log('info', 'Testing connections to all agents');
        
        const results = {};
        for (const [name, config] of Object.entries(this.agents)) {
            try {
                const start = performance.now();
                const response = await fetch(`${this.baseURL}${config.endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        message: 'ping', 
                        context: { test: true } 
                    })
                });
                const duration = Math.round(performance.now() - start);
                
                results[name] = {
                    online: response.ok,
                    status: response.status,
                    latency: duration,
                    endpoint: config.endpoint
                };
                
                this.log('info', `${name} connection test: ${response.ok ? 'OK' : 'FAILED'}`, results[name]);
            } catch (e) {
                results[name] = {
                    online: false,
                    error: e.message,
                    endpoint: config.endpoint
                };
                this.log('error', `${name} connection test failed`, { error: e.message });
            }
        }
        
        return results;
    }

    // Export session data
    exportSessions() {
        return {
            exportedAt: new Date().toISOString(),
            totalSessions: this.sessionHistory.length,
            sessions: this.sessionHistory,
            logs: this.requestLogs
        };
    }

    // Get API configuration
    getConfig() {
        return {
            ...this.config,
            baseURL: this.baseURL,
            agents: Object.keys(this.agents)
        };
    }

    // Update configuration
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.log('info', 'Configuration updated', this.config);
        return this.config;
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
        try {
            const response = await fetch(
                `https://api.github.com/repos/urbansupplyposh-blip/${repo}/commits?per_page=${limit}`,
                { headers: { 'Accept': 'application/vnd.github.v3+json' } }
            );
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const commits = await response.json();
            
            this.cache = commits;
            this.lastFetch = Date.now();
            
            return commits.map(c => ({
                id: c.sha.slice(0, 7),
                message: c.commit.message.split('\n')[0],
                author: c.commit.author.name,
                date: c.commit.author.date,
                avatar: c.author?.avatar_url,
                url: c.html_url
            }));
        } catch (e) {
            console.error('GitHub fetch error:', e);
            return [];
        }
    }

    async getRepoStats(repo = 'belt-os') {
        try {
            const response = await fetch(
                `https://api.github.com/repos/urbansupplyposh-blip/${repo}`,
                { headers: { 'Accept': 'application/vnd.github.v3+json' } }
            );
            
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
            console.error('GitHub stats error:', e);
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

// Initialize global API instance
window.beltAPI = new BeltAPI();
console.log('🔧 Belt API initialized - Ready to connect to agents at', window.beltAPI.baseURL);
