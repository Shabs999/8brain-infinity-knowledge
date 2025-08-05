import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { DocumentUploader } from './components/DocumentUploader';
import { SearchInterface } from './components/SearchInterface';
import { AIAnalysisPage } from './components/AIAnalysisPage';
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

          {/* Development/Demo Routes */}
          <Route path="/brand" element={<BrandShowcase />} />
          <Route path="/typography" element={<TypographyScale />} />
          
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