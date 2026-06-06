import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import TopicChoice from './pages/TopicChoice';
import Research from './pages/Research';
import PostGenerator from './pages/PostGenerator';
import Drafts from './pages/Drafts';
import PastPosts from './pages/PastPosts';
import Settings from './pages/Settings';
import { Loader2 } from 'lucide-react';

function ProtectedLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
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
  );
}

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/topics" replace />;
  }

  return <Login />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthGate />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
