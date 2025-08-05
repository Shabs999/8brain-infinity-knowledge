import React from 'react';
import { Logo, NeuralAnimation } from './BrandElements';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';

interface HeroProps {
  className?: string;
}

export const Hero: React.FC<HeroProps> = ({ className }) => {
  return (
    <section className={cn(
      'relative min-h-screen bg-gradient-to-br from-infinity-blue-50 via-white to-infinity-purple-50 overflow-hidden',
      className
    )}>
      {/* Neural Animation Background */}
      <NeuralAnimation className="absolute inset-0 w-full h-full" />
      
      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          {/* Hero Logo */}
          <div className="mb-8">
            <Logo size="xl" variant="full" className="justify-center" />
          </div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-neural-gray-900 mb-6 leading-tight">
            Your{' '}
            <span className="bg-gradient-to-r from-infinity-blue-600 to-infinity-purple-600 bg-clip-text text-transparent">
              Infinite
            </span>
            {' '}Knowledge
            <br />
            Companion
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-neural-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
            Transform static documents into a dynamic, interconnected intelligence network. 
            Discover hidden connections with voice-first{' '}
            <span className="font-semibold text-infinity-blue-600">Graph RAG</span> technology.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg" 
              variant="neural" 
              className="text-lg px-8 py-4 h-auto"
              onClick={() => window.location.href = '/upload'}
            >
              Start Building Your Knowledge Graph
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 h-auto">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon="📄"
            title="Upload Documents"
            description="Add PDFs, Word docs, and more to build your knowledge base"
            step="1"
          />
          <FeatureCard
            icon="🎙️"
            title="Ask Questions"
            description="Use voice or text to query your interconnected knowledge"
            step="2"
          />
          <FeatureCard
            icon="🔗"
            title="Discover Insights"
            description="Explore connections and relationships in your knowledge graph"
            step="3"
          />
        </div>

        {/* Stats Section */}
        <div className="mt-20 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <StatItem value="<500ms" label="Query Response" />
            <StatItem value="95%+" label="Accuracy Rate" />
            <StatItem value="∞" label="Connections" />
            <StatItem value="10K+" label="Documents" />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-infinity-blue-600 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-infinity-blue-600 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

// Feature Card Component
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  step: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, step }) => {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-8 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-infinity-blue-100 to-infinity-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-infinity-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            {step}
          </div>
        </div>
        <h3 className="text-xl font-bold text-neural-gray-900 mb-3">{title}</h3>
        <p className="text-neural-gray-600 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
};

// Stat Item Component
interface StatItemProps {
  value: string;
  label: string;
}

const StatItem: React.FC<StatItemProps> = ({ value, label }) => {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-black text-infinity-blue-600 mb-2">
        {value}
      </div>
      <div className="text-sm md:text-base text-neural-gray-600 font-medium">
        {label}
      </div>
    </div>
  );
};

// Alternative minimal hero for authenticated users
export const MinimalHero: React.FC<HeroProps> = ({ className }) => {
  return (
    <section className={cn(
      'bg-gradient-to-r from-infinity-blue-600 to-infinity-purple-600 text-white py-16',
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Welcome back to 8Brain
        </h1>
        <p className="text-xl opacity-90 mb-8">
          Continue exploring your infinite knowledge network
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" size="lg" className="bg-white/10 border-white text-white hover:bg-white hover:text-infinity-blue-600">
            Upload Documents
          </Button>
          <Button variant="ghost" size="lg" className="text-white hover:bg-white/20">
            Explore Graph
          </Button>
        </div>
      </div>
    </section>
  );
};