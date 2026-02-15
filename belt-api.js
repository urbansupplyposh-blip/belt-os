// API Bridge to connect Belt OS with real agents
class BeltAPI {
    constructor() {
        this.baseURL = 'http://localhost:8087'; // Waul's Brain endpoint
        this.agents = {
            waul: { endpoint: '/waul', model: 'kimi-k2.5:cloud', emoji: '🦊', color: '#f59e0b' },
            bobby: { endpoint: '/bobby', model: 'llama3.2', emoji: '📊', color: '#3b82f6' },
            maria: { endpoint: '/maria', model: 'llama3.2', emoji: '📝', color: '#ec4899' },
            tim: { endpoint: '/tim', model: 'codex-5.2', emoji: '⚙️', color: '#10b981' }
        };
        this.sessionHistory = [];
    }

    async checkStatus() {
        try {
            const response = await fetch(`${this.baseURL}/status`);
            return await response.json();
        } catch (e) {
            return { status: 'offline', agents: [] };
        }
    }

    async sendMessage(agent, message, context = {}) {
        const agentConfig = this.agents[agent];
        if (!agentConfig) throw new Error(`Unknown agent: ${agent}`);

        const startTime = Date.now();
        try {
            const response = await fetch(`${this.baseURL}${agentConfig.endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context })
            });
            
            const data = await response.json();
            const duration = Date.now() - startTime;
            
            // Record session
            const session = {
                id: Date.now(),
                agent,
                message: message.slice(0, 100),
                response: data.response?.slice(0, 100),
                timestamp: new Date().toISOString(),
                duration,
                tokens: data.tokens || 0,
                cost: data.cost || 0
            };
            this.sessionHistory.unshift(session);
            if (this.sessionHistory.length > 50) this.sessionHistory.pop();
            
            return { ...data, session };
        } catch (e) {
            return { error: e.message, agent, offline: true };
        }
    }

    async teamTask(task, context = {}) {
        // Send to all agents and collect responses
        const responses = await Promise.all(
            Object.keys(this.agents).map(async agent => {
                try {
                    const res = await this.sendMessage(agent, task, context);
                    return { agent, ...res };
                } catch (e) {
                    return { agent, error: e.message, offline: true };
                }
            })
        );
        return responses;
    }

    getSessionHistory(agent = null) {
        if (agent) {
            return this.sessionHistory.filter(s => s.agent === agent);
        }
        return this.sessionHistory;
    }

    // Real-time polling for active sessions
    startPolling(callback, interval = 5000) {
        return setInterval(async () => {
            const status = await this.checkStatus();
            callback(status);
        }, interval);
    }
}

// GitHub integration for the Overnight Log
class GitHubIntegration {
    constructor() {
        this.cache = [];
        this.lastFetch = null;
    }

    async getRecentCommits(repo = 'belt-os', limit = 10) {
        try {
            const response = await fetch(`https://api.github.com/repos/urbansupplyposh-blip/${repo}/commits?per_page=${limit}`);
            const commits = await response.json();
            
            return commits.map(c => ({
                id: c.sha.slice(0, 7),
                message: c.commit.message.split('\n')[0],
                author: c.commit.author.name,
                date: c.commit.author.date,
                avatar: c.author?.avatar_url
            }));
        } catch (e) {
            return [];
        }
    }

    async getRepoStats() {
        try {
            const response = await fetch('https://api.github.com/repos/urbansupplyposh-blip/belt-os');
            const data = await response.json();
            return {
                stars: data.stargazers_count,
                forks: data.forks_count,
                issues: data.open_issues_count,
                updated: data.updated_at
            };
        } catch (e) {
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
        return saved ? JSON.parse(saved) : { unread: 0, messages: [] };
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
