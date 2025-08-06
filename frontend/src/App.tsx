import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { DocumentUploader } from './components/DocumentUploader';
import { SearchInterface } from './components/SearchInterface';
import { AIAnalysisPage } from './components/AIAnalysisPage';
import SimpleGraphPage from './components/SimpleGraphPage';
import EnhancedKnowledgeGraph from './components/EnhancedKnowledgeGraph';
import VoicePage from './components/VoicePage';
import VoiceGraphPage from './components/VoiceGraphPage';
import { BrandShowcase, TypographyScale } from './components/BrandElements';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-infinity-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-infinity-blue-600"></div>
      </div>
    );
  }
  
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

function AppContent() {
  const { isAuthenticated } = useAuth();

  const handleFileUpload = (files: File[]) => {
    console.log('Files uploaded:', files);
    // TODO: Integrate with backend API
  };

  return (
    <Router>
      <div className="App min-h-screen">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/auth" 
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            } 
          />
          
          {/* Landing Page (public, but with different header for authenticated users) */}
          <Route 
            path="/" 
            element={
              <>
                <Header />
                <Hero />
              </>
            } 
          />

          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Header />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="text-center py-16">
                    <h1 className="text-4xl font-bold text-neural-gray-900 mb-4">
                      Welcome to Your 8Brain Dashboard
                    </h1>
                    <p className="text-xl text-neural-gray-600 mb-8">
                      Your infinite knowledge companion is ready to help you explore and connect ideas.
                    </p>
                  </div>
                </main>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <Header />
                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold text-neural-gray-900 mb-2">
                      Upload Documents
                    </h1>
                    <p className="text-lg text-neural-gray-600">
                      Build your knowledge graph by uploading documents. Supported formats: PDF, DOCX, TXT, MD, EPUB.
                    </p>
                  </div>
                  <DocumentUploader onFileUpload={handleFileUpload} />
                </main>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/search" 
            element={
              <ProtectedRoute>
                <Header />
                <main className="min-h-screen bg-gray-50">
                  <SearchInterface />
                </main>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/ai" 
            element={
              <ProtectedRoute>
                <Header />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <AIAnalysisPage />
                </main>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/graph" 
            element={
              <ProtectedRoute>
                <Header />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold text-neural-gray-900 mb-2">
                      Knowledge Graph Visualization
                    </h1>
                    <p className="text-lg text-neural-gray-600">
                      Interactive exploration of your documents, concepts, entities, and their relationships.
                    </p>
                  </div>
                  <EnhancedKnowledgeGraph width={1200} height={700} />
                  
                  {/* Fallback simple stats */}
                  <div className="mt-8">
                    <h2 className="text-xl font-semibold text-neural-gray-800 mb-4">Graph Statistics</h2>
                    <SimpleGraphPage />
                  </div>
                </main>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/voice" 
            element={
              <ProtectedRoute>
                <Header />
                <main>
                  <VoicePage />
                </main>
              </ProtectedRoute>
            } 
          />

          {/* Development/Demo Routes */}
          <Route path="/brand" element={<BrandShowcase />} />
          <Route path="/typography" element={<TypographyScale />} />
          
          {/* Temporary unprotected graph demo */}
          <Route 
            path="/graph-demo" 
            element={
              <>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold text-neural-gray-900 mb-2">
                      Knowledge Graph Demo (No Auth Required)
                    </h1>
                    <p className="text-lg text-neural-gray-600">
                      Interactive visualization demo with sample data.
                    </p>
                  </div>
                  <EnhancedKnowledgeGraph width={1200} height={700} />
                </div>
              </>
            } 
          />
          
          {/* Voice demo route */}
          <Route 
            path="/voice-demo" 
            element={<VoicePage />}
          />
          
          {/* Voice + Graph combined demo */}
          <Route 
            path="/voice-graph-demo" 
            element={<VoiceGraphPage />}
          />
          
          {/* Redirect root to appropriate page */}
          <Route 
            path="*" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;