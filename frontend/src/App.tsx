import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { BrandShowcase, TypographyScale } from './components/BrandElements';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App min-h-screen">
        <Header />
        
        <main>
          <Routes>
            <Route path="/" element={<Hero />} />
            <Route path="/brand" element={<BrandShowcase />} />
            <Route path="/typography" element={<TypographyScale />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;