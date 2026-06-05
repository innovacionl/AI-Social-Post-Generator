import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopicChoice from './pages/TopicChoice';
import Research from './pages/Research';
import PostGenerator from './pages/PostGenerator';
import Drafts from './pages/Drafts';
import PastPosts from './pages/PastPosts';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <main className="ml-64 min-h-screen">
          <Routes>
            <Route path="/" element={<Navigate to="/topics" replace />} />
            <Route path="/topics" element={<TopicChoice />} />
            <Route path="/research" element={<Research />} />
            <Route path="/posts" element={<PostGenerator />} />
            <Route path="/drafts" element={<Drafts />} />
            <Route path="/past-posts" element={<PastPosts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
