import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import VotingPage from './pages/VotingPage';
import ElectionSelectionPage from './pages/ElectionSelectionPage';
import VoterVerificationPage from './pages/VoterVerificationPage';
import BallotPage from './pages/BallotPage';
import ReviewPage from './pages/ReviewPage';
import ConfirmationPage from './pages/ConfirmationPage';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import { VotingProvider } from './context/VotingContext';
import { SecurityProvider } from './context/SecurityContext';
import './styles/voting.css';
import './styles/security.css';
import './styles/responsive.css';

function App() {
  return (
    <SecurityProvider>
      <VotingProvider>
        <Router>
          <div className="app-container">
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/elections" replace />} />
                <Route path="/elections" element={<ElectionSelectionPage />} />
                <Route path="/verify/:electionId" element={<VoterVerificationPage />} />
                <Route path="/vote/:electionId" element={<BallotPage />} />
                <Route path="/review/:electionId" element={<ReviewPage />} />
                <Route path="/confirmation/:electionId" element={<ConfirmationPage />} />
                <Route path="/voting" element={<VotingPage />} />
                <Route path="*" element={<Navigate to="/elections" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </VotingProvider>
    </SecurityProvider>
  );
}

export default App;