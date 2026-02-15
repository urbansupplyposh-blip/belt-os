// Real-time cost tracking for Belt OS
class CostMonitor {
    constructor() {
        this.agents = {
            waul: { name: 'Waul', model: 'kimi-k2.5:cloud', costPer1K: 0.001, emoji: '🦊' },
            bobby: { name: 'Bobby', model: 'llama3.2', costPer1K: 0, emoji: '📊' },
            maria: { name: 'Maria', model: 'llama3.2', costPer1K: 0, emoji: '📝' },
            tim: { name: 'Tim', model: 'codex-5.2', costPer1K: 0.003, emoji: '⚙️' }
        };
        this.dailyBudget = 1.00; // $1/day budget
        this.usage = this.loadUsage();
    }

    loadUsage() {
        const saved = localStorage.getItem('beltos_usage');
        return saved ? JSON.parse(saved) : { today: {}, history: [] };
    }

    saveUsage() {
        localStorage.setItem('beltos_usage', JSON.stringify(this.usage));
    }

    recordCall(agent, tokens) {
        const cost = (tokens / 1000) * this.agents[agent].costPer1K;
        if (!this.usage.today[agent]) {
            this.usage.today[agent] = { calls: 0, tokens: 0, cost: 0 };
        }
        this.usage.today[agent].calls++;
        this.usage.today[agent].tokens += tokens;
        this.usage.today[agent].cost += cost;
        this.saveUsage();
        return cost;
    }

    getTodayTotal() {
        return Object.values(this.usage.today).reduce((sum, u) => sum + u.cost, 0);
    }

    getBudgetRemaining() {
        return this.dailyBudget - this.getTodayTotal();
    }

    resetDaily() {
        this.usage.history.push({
            date: new Date().toISOString().split('T')[0],
            usage: this.usage.today,
            total: this.getTodayTotal()
        });
        this.usage.today = {};
        this.saveUsage();
    }

    renderDashboard() {
        const total = this.getTodayTotal();
        const remaining = this.getBudgetRemaining();
        const percentUsed = (total / this.dailyBudget) * 100;
        
        return `
            <div class="cost-dashboard">
                <div class="budget-card">
                    <div class="budget-header">
                        <span class="budget-label">Daily Budget</span>
                        <span class="budget-amount">$${this.dailyBudget.toFixed(2)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentUsed}%; background: ${percentUsed > 80 ? '#ef4444' : '#10b981'}"></div>
                    </div>
                    <div class="budget-stats">
                        <span>Used: $${total.toFixed(4)}</span>
                        <span>Remaining: $${remaining.toFixed(4)}</span>
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
}

// Session tracker
class SessionTracker {
    constructor() {
        this.sessions = [];
        this.loadSessions();
    }

    loadSessions() {
        const saved = localStorage.getItem('beltos_sessions');
        if (saved) {
            this.sessions = JSON.parse(saved);
        }
    }

    saveSessions() {
        localStorage.setItem('beltos_sessions', JSON.stringify(this.sessions));
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
        this.saveSessions();
        return session;
    }

    updateSession(id, tokens, cost) {
        const session = this.sessions.find(s => s.id === id);
        if (session) {
            session.tokens += tokens;
            session.cost += cost;
            this.saveSessions();
        }
    }

    endSession(id) {
        const session = this.sessions.find(s => s.id === id);
        if (session) {
            session.status = 'completed';
            session.ended = new Date().toISOString();
            this.saveSessions();
        }
    }

    getActiveSessions() {
        return this.sessions.filter(s => s.status === 'active');
    }

    getRecentSessions(limit = 10) {
        return this.sessions.slice(0, limit);
    }
}

// Cron monitor
class CronMonitor {
    constructor() {
        this.jobs = [
            { id: 'morning', name: 'Morning Briefing', desc: 'Daily status check', schedule: '8:00 AM ET', status: 'active', tag: 'OPS', lastRun: null },
            { id: 'github', name: 'GitHub Backup', desc: 'Repository sync', schedule: 'Every 12h', status: 'active', tag: 'BRAIN', lastRun: null },
            { id: 'imessage', name: 'iMessage Heartbeat', desc: 'Check inbox', schedule: 'Every 30m', status: 'active', tag: 'LAB', lastRun: null },
            { id: 'cost', name: 'Cost Tracking', desc: 'Monitor spend', schedule: 'Hourly', status: 'active', tag: 'OPS', lastRun: null },
            { id: 'memory', name: 'Memory Maintenance', desc: 'Archive cleanup', schedule: '2:00 AM', status: 'paused', tag: 'BRAIN', lastRun: null },
            { id: 'standup', name: 'Daily Standup', desc: 'Team sync', schedule: '9:00 AM ET', status: 'active', tag: 'COMMUNITY', lastRun: null }
        ];
    }

    runJob(id) {
        const job = this.jobs.find(j => j.id === id);
        if (job) {
            job.lastRun = new Date().toISOString();
            job.status = 'running';
            setTimeout(() => {
                job.status = 'active';
            }, 2000);
        }
    }

    toggleJob(id) {
        const job = this.jobs.find(j => j.id === id);
        if (job) {
            job.status = job.status === 'active' ? 'paused' : 'active';
        }
    }

    getJobs() {
        return this.jobs;
    }
}

// Export for use
window.BeltOS = {
    CostMonitor,
    SessionTracker,
    CronMonitor
};
