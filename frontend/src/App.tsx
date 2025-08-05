import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { DocumentUploader } from './components/DocumentUploader';
import { BrandShowcase, TypographyScale } from './components/BrandElements';
import './App.css';

function App() {
  const handleFileUpload = (files: File[]) => {
    console.log('Files uploaded:', files);
    // TODO: Integrate with backend API
  };

  return (
    <Router>
      <div className="App min-h-screen">
        <Header />
        
        <main>
          <Routes>
            <Route path="/" element={<Hero />} />
            <Route path="/upload" element={
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-neural-gray-900 mb-2">
                    Upload Documents
                  </h1>
                  <p className="text-lg text-neural-gray-600">
                    Build your knowledge graph by uploading documents. Supported formats: PDF, DOCX, TXT, MD, EPUB.
                  </p>
                </div>
                <DocumentUploader onFileUpload={handleFileUpload} />
              </div>
            } />
            <Route path="/brand" element={<BrandShowcase />} />
            <Route path="/typography" element={<TypographyScale />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;