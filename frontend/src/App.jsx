import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import InboxPage from './pages/InboxPage';
import MessagePage from './pages/MessagePage';
import ChatPage from './pages/ChatPage';
import AnalyticsPage from './pages/AnalyticsPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/message/:id" element={<MessagePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
