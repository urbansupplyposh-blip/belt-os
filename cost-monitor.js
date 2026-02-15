// Real-time cost tracking for Belt OS
class CostMonitor {
    constructor() {
        this.agents = {
            waul: { name: 'Waul', model: 'kimi-k2.5:cloud', costPer1K: 0.001, emoji: '🦊', color: '#f59e0b' },
            bobby: { name: 'Bobby', model: 'llama3.2', costPer1K: 0, emoji: '📊', color: '#3b82f6' },
            maria: { name: 'Maria', model: 'llama3.2', costPer1K: 0, emoji: '📝', color: '#ec4899' },
            tim: { name: 'Tim', model: 'codex-5.2', costPer1K: 0.003, emoji: '⚙️', color: '#10b981' }
        };
        this.dailyBudget = 1.00; // $1/day budget
        this.usage = this.loadUsage();
        this.callbacks = []; // For cost update callbacks
        
        // Initialize with today's date
        this.ensureCurrentDay();
    }
    
    // Register callback for cost updates
    onUpdate(callback) {
        this.callbacks.push(callback);
    }
    
    notifyUpdate() {
        this.callbacks.forEach(cb => cb(this.usage));
    }

    loadUsage() {
        const saved = localStorage.getItem('beltos_usage');
        if (saved) {
            const data = JSON.parse(saved);
            // Check if data is from today
            const today = new Date().toISOString().split('T')[0];
            if (data.date !== today) {
                // Archive old day and reset
                this.archiveDay(data);
                return { date: today, today: {}, history: data.history || [] };
            }
            return data;
        }
        return { 
            date: new Date().toISOString().split('T')[0], 
            today: {}, 
            history: [] 
        };
    }
    
    ensureCurrentDay() {
        const today = new Date().toISOString().split('T')[0];
        if (this.usage.date !== today) {
            // Archive old data
            if (Object.keys(this.usage.today).length > 0) {
                this.usage.history.push({
                    date: this.usage.date,
                    usage: this.usage.today,
                    total: this.getTodayTotal()
                });
            }
            // Reset for new day
            this.usage.date = today;
            this.usage.today = {};
            this.saveUsage();
        }
    }
    
    archiveDay(data) {
        if (!data.history) data.history = [];
        if (Object.keys(data.today).length > 0) {
            data.history.push({
                date: data.date || new Date(Date.now() - 86400000).toISOString().split('T')[0],
                usage: data.today,
                total: Object.values(data.today).reduce((sum, u) => sum + u.cost, 0)
            });
        }
        // Keep only last 30 days
        if (data.history.length > 30) {
            data.history = data.history.slice(-30);
        }
    }

    saveUsage() {
        localStorage.setItem('beltos_usage', JSON.stringify(this.usage));
    }

    recordCall(agent, tokens, duration = null) {
        this.ensureCurrentDay();
        
        const agentConfig = this.agents[agent];
        if (!agentConfig) {
            console.warn(`Unknown agent: ${agent}`);
            return 0;
        }
        
        const cost = (tokens / 1000) * agentConfig.costPer1K;
        
        if (!this.usage.today[agent]) {
            this.usage.today[agent] = { 
                calls: 0, 
                tokens: 0, 
                cost: 0,
                durations: [],
                lastCall: null
            };
        }
        
        this.usage.today[agent].calls++;
        this.usage.today[agent].tokens += tokens;
        this.usage.today[agent].cost += cost;
        this.usage.today[agent].lastCall = new Date().toISOString();
        if (duration) {
            this.usage.today[agent].durations.push(duration);
        }
        
        this.saveUsage();
        this.notifyUpdate();
        
        // Log if approaching budget
        const total = this.getTodayTotal();
        if (total > this.dailyBudget * 0.8) {
            console.warn(`[CostMonitor] Approaching daily budget: $${total.toFixed(4)} / $${this.dailyBudget.toFixed(2)}`);
        }
        if (total > this.dailyBudget) {
            console.error(`[CostMonitor] Daily budget exceeded! $${total.toFixed(4)} / $${this.dailyBudget.toFixed(2)}`);
        }
        
        return cost;
    }
    
    // Record from API response (includes metadata)
    recordFromAPIResponse(agent, metadata) {
        if (!metadata) return 0;
        return this.recordCall(agent, metadata.tokens || 0, metadata.duration || null);
    }

    getTodayTotal() {
        this.ensureCurrentDay();
        return Object.values(this.usage.today).reduce((sum, u) => sum + u.cost, 0);
    }
    
    getTodayStats() {
        this.ensureCurrentDay();
        let totalCalls = 0;
        let totalTokens = 0;
        
        Object.values(this.usage.today).forEach(u => {
            totalCalls += u.calls;
            totalTokens += u.tokens;
        });
        
        return {
            cost: this.getTodayTotal(),
            calls: totalCalls,
            tokens: totalTokens,
            budgetRemaining: this.getBudgetRemaining(),
            percentUsed: (this.getTodayTotal() / this.dailyBudget) * 100
        };
    }

    getBudgetRemaining() {
        return this.dailyBudget - this.getTodayTotal();
    }

    resetDaily() {
        this.usage.history.push({
            date: this.usage.date,
            usage: this.usage.today,
            total: this.getTodayTotal()
        });
        this.usage.today = {};
        this.usage.date = new Date().toISOString().split('T')[0];
        this.saveUsage();
        this.notifyUpdate();
    }
    
    getHistory(days = 7) {
        return this.usage.history.slice(-days);
    }
    
    getAgentStats(agent) {
        this.ensureCurrentDay();
        const today = this.usage.today[agent] || { calls: 0, tokens: 0, cost: 0 };
        
        // Calculate average from history
        const historyForAgent = this.usage.history.filter(h => h.usage[agent]);
        const avgDaily = historyForAgent.length > 0 
            ? historyForAgent.reduce((sum, h) => sum + h.usage[agent].cost, 0) / historyForAgent.length
            : 0;
            
        return {
            ...today,
            avgDailyCost: avgDaily,
            projectedMonthly: (today.cost + avgDaily * 29)
        };
    }

    renderDashboard() {
        this.ensureCurrentDay();
        const total = this.getTodayTotal();
        const remaining = this.getBudgetRemaining();
        const percentUsed = (total / this.dailyBudget) * 100;
        const stats = this.getTodayStats();
        
        // Determine status color
        let statusColor = '#10b981'; // green
        if (percentUsed > 80) statusColor = '#ef4444'; // red
        else if (percentUsed > 50) statusColor = '#f59e0b'; // amber
        
        return `
            <div class="cost-dashboard">
                <div class="budget-card">
                    <div class="budget-header">
                        <span class="budget-label">Daily Budget</span>
                        <span class="budget-amount">$${this.dailyBudget.toFixed(2)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(percentUsed, 100)}%; background: ${statusColor}"></div>
                    </div>
                    <div class="budget-stats">
                        <span>Used: $${total.toFixed(4)}</span>
                        <span>Remaining: $${remaining.toFixed(4)}</span>
                        <span>${stats.calls} calls · ${(stats.tokens/1000).toFixed(1)}K tokens</span>
                    </div>
                </div>
                <div class="agent-usage-grid">
                    ${Object.entries(this.agents).map(([key, agent]) => {
                        const usage = this.usage.today[key] || { calls: 0, tokens: 0, cost: 0 };
                        return `
                            <div class="usage-card">
                                <div class="usage-agent">
                                    <span class="usage-emoji">${agent.emoji}</span>
                                    <span class="usage-name">${agent.name}</span>
                                </div>
                                <div class="usage-model">${agent.model}</div>
                                <div class="usage-stats">
                                    <div>${usage.calls} calls</div>
                                    <div>${(usage.tokens/1000).toFixed(1)}K tokens</div>
                                    <div class="usage-cost">$${usage.cost.toFixed(4)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // Generate cost report for export
    generateReport() {
        this.ensureCurrentDay();
        return {
            generatedAt: new Date().toISOString(),
            currentPeriod: {
                date: this.usage.date,
                total: this.getTodayTotal(),
                budget: this.dailyBudget,
                remaining: this.getBudgetRemaining()
            },
            agents: Object.entries(this.agents).map(([key, agent]) => ({
                name: agent.name,
                ...this.getAgentStats(key)
            })),
            history: this.usage.history.slice(-7)
        };
    }
}

// Session tracker - enhanced to work with BeltAPI
class SessionTracker {
    constructor() {
        this.sessions = [];
        this.loadSessions();
        this.callbacks = [];
    }
    
    onUpdate(callback) {
        this.callbacks.push(callback);
    }
    
    notifyUpdate() {
        this.callbacks.forEach(cb => cb(this.sessions));
    }

    loadSessions() {
        const saved = localStorage.getItem('beltos_sessions');
        if (saved) {
            this.sessions = JSON.parse(saved);
        }
    }

    saveSessions() {
        localStorage.setItem('beltos_sessions', JSON.stringify(this.sessions.slice(0, 100)));
    }

    startSession(title, agent, type = 'task') {
        const session = {
            id: Date.now(),
            title,
            agent,
            type,
            started: new Date().toISOString(),
            status: 'active',
            tokens: 0,
            cost: 0,
            messages: []
        };
        this.sessions.unshift(session);
        if (this.sessions.length > 100) {
            this.sessions = this.sessions.slice(0, 100);
        }
        this.saveSessions();
        this.notifyUpdate();
        return session;
    }

    updateSession(id, tokens, cost) {
        const session = this.sessions.find(s => s.id === id || s.id === parseInt(id));
        if (session) {
            session.tokens += tokens;
            session.cost += cost;
            this.saveSessions();
            this.notifyUpdate();
        }
    }
    
    addMessage(id, role, content) {
        const session = this.sessions.find(s => s.id === id || s.id === parseInt(id));
        if (session) {
            session.messages.push({
                role,
                content,
                timestamp: new Date().toISOString()
            });
            this.saveSessions();
        }
    }

    endSession(id) {
        const session = this.sessions.find(s => s.id === id || s.id === parseInt(id));
        if (session) {
            session.status = 'completed';
            session.ended = new Date().toISOString();
            this.saveSessions();
            this.notifyUpdate();
        }
    }

    getActiveSessions() {
        return this.sessions.filter(s => s.status === 'active');
    }

    getRecentSessions(limit = 10) {
        return this.sessions.slice(0, limit);
    }
    
    getSessionsByAgent(agent) {
        return this.sessions.filter(s => s.agent === agent);
    }
    
    clearAll() {
        this.sessions = [];
        this.saveSessions();
        this.notifyUpdate();
    }
}

// Cron monitor
class CronMonitor {
    constructor() {
        this.jobs = [
            { id: 'morning', name: 'Morning Briefing', desc: 'Daily status check', schedule: '8:00 AM ET', status: 'active', tag: 'OPS', lastRun: null, nextRun: null },
            { id: 'github', name: 'GitHub Backup', desc: 'Repository sync', schedule: 'Every 12h', status: 'active', tag: 'BRAIN', lastRun: null, nextRun: null },
            { id: 'imessage', name: 'iMessage Heartbeat', desc: 'Check inbox', schedule: 'Every 30m', status: 'active', tag: 'LAB', lastRun: null, nextRun: null },
            { id: 'cost', name: 'Cost Tracking', desc: 'Monitor spend', schedule: 'Hourly', status: 'active', tag: 'OPS', lastRun: null, nextRun: null },
            { id: 'memory', name: 'Memory Maintenance', desc: 'Archive cleanup', schedule: '2:00 AM', status: 'paused', tag: 'BRAIN', lastRun: null, nextRun: null },
            { id: 'standup', name: 'Daily Standup', desc: 'Team sync', schedule: '9:00 AM ET', status: 'active', tag: 'COMMUNITY', lastRun: null, nextRun: null }
        ];
        this.callbacks = [];
    }
    
    onUpdate(callback) {
        this.callbacks.push(callback);
    }
    
    notifyUpdate() {
        this.callbacks.forEach(cb => cb(this.jobs));
    }

    runJob(id) {
        const job = this.jobs.find(j => j.id === id);
        if (job) {
            job.lastRun = new Date().toISOString();
            job.status = 'running';
            this.notifyUpdate();
            
            setTimeout(() => {
                job.status = 'active';
                this.notifyUpdate();
            }, 2000);
        }
    }

    toggleJob(id) {
        const job = this.jobs.find(j => j.id === id);
        if (job) {
            job.status = job.status === 'active' ? 'paused' : 'active';
            this.notifyUpdate();
        }
    }

    getJobs() {
        return this.jobs;
    }
    
    getActiveJobs() {
        return this.jobs.filter(j => j.status === 'active');
    }
}

// Export for use
window.BeltOS = {
    CostMonitor,
    SessionTracker,
    CronMonitor
};

// Also export individual classes for direct use
window.CostMonitor = CostMonitor;
window.SessionTracker = SessionTracker;
window.CronMonitor = CronMonitor;
