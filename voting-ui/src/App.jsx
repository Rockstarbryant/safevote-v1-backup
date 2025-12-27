import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import UserProfile from './pages/UserProfile';
import TablesPage from './pages/TablesPage';
import Typography from './pages/Typography';
import VotingPage from './pages/VotingPage';
import ElectionSelectionPage from './pages/ElectionSelectionPage';
import VoterVerificationPage from './pages/VoterVerificationPage';
import BallotPage from './pages/BallotPage';
import ReviewPage from './pages/ReviewPage';
import ConfirmationPage from './pages/ConfirmationPage';
import LegacyCreateElection from './pages/LegacyCreateElection';  // We'll create this next
import CreateElectionPage from './pages/CreateElectionPage';
import ResultsPage from './pages/ResultsPage';
import OnChainResultsPage from './pages/OnChainResultsPage';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import { VotingProvider } from './context/VotingContext';
import { SecurityProvider } from './context/SecurityContext';
import './styles/voting.css';
import './styles/security.css';
import './styles/responsive.css';
import './styles/ResultsPage.css';
import './styles/CreateElectionPage.css';
import './styles/material-dark.css';
import './styles/tables-profile.css';
import './styles/typography.css';
import './styles/onchain-results.css';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SecurityProvider>
      <VotingProvider>
        <Router>
          <div className="app-container">
            <Sidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
            <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
              <Header />
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/tables" element={<TablesPage />} />
                <Route path="/typography" element={<Typography />} />
                <Route path="/elections" element={<ElectionSelectionPage />} />
                <Route path="/verify/:electionId" element={<VoterVerificationPage />} />
                <Route path="/vote/:electionId" element={<BallotPage />} />
                <Route path="/review/:electionId" element={<ReviewPage />} />
                <Route path="/confirmation/:electionId" element={<ConfirmationPage />} />
                <Route path="/voting" element={<VotingPage />} />
                <Route path="/results/:electionId" element={<ResultsPage />} />
                <Route path="/results/onchain/:electionId" element={<OnChainResultsPage />} />
                <Route path="/legacy-create-election" element={<LegacyCreateElection />} />
                <Route path="/create-election" element={<CreateElectionPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <Footer />
            </div>
          </div>
        </Router>
      </VotingProvider>
    </SecurityProvider>
  );
}

export default App;