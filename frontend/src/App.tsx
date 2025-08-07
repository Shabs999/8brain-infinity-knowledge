import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CollaborativeVoicePage } from './components/CollaborativeVoicePage';
import { TestPage } from './components/TestPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="text-3xl font-bold text-blue-600 transform rotate-90">
                  ∞
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  8Brain
                </h1>
                <span className="text-sm text-gray-500 font-medium">
                  Infinity Brain
                </span>
              </div>
              
              <nav className="flex items-center space-x-8">
                <a 
                  href="#" 
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                >
                  Dashboard
                </a>
                <a 
                  href="#" 
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                >
                  Documents
                </a>
                <a 
                  href="#" 
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                >
                  Graph
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/test" element={<TestPage />} />
            <Route path="/collaborate/:sessionId" element={<CollaborativeVoicePage />} />
            <Route path="/" element={
              <div className="text-center py-16">
                <div className="mb-8">
                  <div className="text-8xl font-bold text-blue-600 transform rotate-90 inline-block mb-4">
                    ∞
                  </div>
                  <h1 className="text-5xl font-bold text-gray-900 mb-4">
                    8Brain
                  </h1>
                  <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                    Your Infinite Knowledge Companion. Transform static documents into a dynamic, 
                    interconnected intelligence network with voice-first Graph RAG.
                  </p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Getting Started
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="p-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-blue-600 font-bold">1</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Upload Documents</h3>
                      <p className="text-sm text-gray-600">
                        Add PDFs, Word docs, and more to build your knowledge base
                      </p>
                    </div>
                    
                    <div className="p-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-purple-600 font-bold">2</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Ask Questions</h3>
                      <p className="text-sm text-gray-600">
                        Use voice or text to query your interconnected knowledge
                      </p>
                    </div>
                    
                    <div className="p-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-yellow-600 font-bold">3</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Discover Insights</h3>
                      <p className="text-sm text-gray-600">
                        Explore connections and relationships in your knowledge graph
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;