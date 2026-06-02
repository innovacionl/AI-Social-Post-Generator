import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SetupModal, { SETUP_DISMISSED_KEY } from './components/SetupModal';
import TopicChoice from './pages/TopicChoice';
import Research from './pages/Research';
import PostGenerator from './pages/PostGenerator';
import Drafts from './pages/Drafts';
import PastPosts from './pages/PastPosts';

function App() {
  const [setupOpen, setSetupOpen] = useState(
    () => localStorage.getItem(SETUP_DISMISSED_KEY) !== 'true'
  );

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Sidebar onOpenSetup={() => setSetupOpen(true)} />
        <main className="ml-64 min-h-screen">
          <Routes>
            <Route path="/" element={<Navigate to="/topics" replace />} />
            <Route path="/topics" element={<TopicChoice />} />
            <Route path="/research" element={<Research />} />
            <Route path="/posts" element={<PostGenerator />} />
            <Route path="/drafts" element={<Drafts />} />
            <Route path="/past-posts" element={<PastPosts />} />
          </Routes>
        </main>
      </div>
      <SetupModal open={setupOpen} onClose={() => setSetupOpen(false)} />
    </BrowserRouter>
  );
}

export default App;
