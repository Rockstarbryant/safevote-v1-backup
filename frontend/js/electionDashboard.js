/**
 * electionDashboard.js
 * Handles dashboard logic and election data management
 */

const ElectionDashboard = {
    electionId: null,
    electionData: null,

    /**
     * Initialize dashboard
     */
    init() {
        // Get election ID from URL params
        const params = new URLSearchParams(window.location.search);
        this.electionId = params.get('electionId') || 
                         sessionStorage.getItem('selectedElectionId');

        // Load election data
        this.loadElectionData();
    },

    /**
     * Load election data from contract or session
     */
    async loadElectionData() {
        try {
            if (this.electionId) {
                // Load from smart contract
                const contract = window.Contract?.contract;
                if (contract) {
                    const election = await contract.getElection(this.electionId);
                    this.electionData = election;
                    this.renderDashboard();
                } else {
                    // Use mock data for demo
                    this.useMockData();
                }
            } else {
                // Use mock data
                this.useMockData();
            }
        } catch (error) {
            console.error('Error loading election:', error);
            this.useMockData();
        }
    },

    /**
     * Use mock data for demo/testing
     */
    useMockData() {
        this.electionData = {
            title: '2025 Student Government Election',
            description: 'Annual election for student government positions',
            location: 'Stanford University',
            startTime: Math.floor(new Date('2025-01-15').getTime() / 1000),
            endTime: Math.floor(new Date('2025-01-22').getTime() / 1000),
            totalRegisteredVoters: 25000,
            totalVotesCast: 12547,
            isPublic: true,
            allowAnonymous: true,
            allowDelegation: false,
            creator: '0x1234567890123456789012345678901234567890',
            status: 1, // LIVE
            positions: [
                { title: 'President', candidates: ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Miller'] },
                { title: 'Vice President', candidates: ['Emma Wilson', 'Frank Brown', 'Grace Taylor'] },
                { title: 'Secretary', candidates: ['Henry Clark', 'Iris Martinez', 'Jack Anderson'] },
                { title: 'Treasurer', candidates: ['Karen Lee', 'Leo Garcia', 'Maya Patel'] }
            ]
        };
        this.updateDashboardUI();
    },

    /**
     * Render dashboard with real data
     */
    renderDashboard() {
        this.updateDashboardUI();
    },

    /**
     * Update all dashboard UI elements
     */
    updateDashboardUI() {
        if (this.electionData) {
            document.getElementById('electionTitle').textContent = this.electionData.title;
            document.getElementById('registeredVoters').textContent = 
                this.electionData.totalRegisteredVoters?.toLocaleString() || '25,000';
            document.getElementById('totalVotes').textContent = 
                this.electionData.totalVotesCast?.toLocaleString() || '12,547';
            document.getElementById('totalPositions').textContent = 
                this.electionData.positions?.length || '4';
            
            const turnout = ((this.electionData.totalVotesCast / this.electionData.totalRegisteredVoters) * 100).toFixed(1);
            document.getElementById('turnoutRate').textContent = turnout + '%';
        }
    }
};

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    ElectionDashboard.init();
});