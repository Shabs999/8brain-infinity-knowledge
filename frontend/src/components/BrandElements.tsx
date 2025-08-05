import React from 'react';
import { cn } from '@/lib/utils';

// Logo Component with infinity symbol as 8
interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'minimal' | 'full';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'default',
  className 
}) => {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl', 
    lg: 'text-6xl',
    xl: 'text-8xl'
  };

  const infinitySymbol = (
    <span 
      className={cn(
        'inline-block transform rotate-90 font-bold text-infinity-blue-600 infinity-pulse',
        sizeClasses[size]
      )}
      aria-label="Infinity symbol representing 8Brain"
    >
      ∞
    </span>
  );

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center', className)}>
        {infinitySymbol}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        {infinitySymbol}
        <div className="flex flex-col">
          <h1 className={cn(
            'font-bold text-neural-gray-900 leading-none',
            size === 'sm' ? 'text-xl' : 
            size === 'md' ? 'text-3xl' :
            size === 'lg' ? 'text-5xl' : 'text-7xl'
          )}>
            8Brain
          </h1>
          <span className={cn(
            'text-neural-gray-500 font-medium leading-none',
            size === 'sm' ? 'text-xs' :
            size === 'md' ? 'text-sm' :
            size === 'lg' ? 'text-lg' : 'text-xl'
          )}>
            Infinity Brain
          </span>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {infinitySymbol}
      <h1 className={cn(
        'font-bold text-neural-gray-900',
        size === 'sm' ? 'text-xl' :
        size === 'md' ? 'text-3xl' :
        size === 'lg' ? 'text-5xl' : 'text-7xl'
      )}>
        8Brain
      </h1>
    </div>
  );
};

// Brand Colors Component
export const BrandShowcase: React.FC = () => {
  const colorPalette = [
    {
      name: 'Infinity Blue',
      colors: [
        { shade: '50', class: 'bg-infinity-blue-50', hex: '#eff6ff' },
        { shade: '100', class: 'bg-infinity-blue-100', hex: '#dbeafe' },
        { shade: '200', class: 'bg-infinity-blue-200', hex: '#bfdbfe' },
        { shade: '300', class: 'bg-infinity-blue-300', hex: '#93c5fd' },
        { shade: '400', class: 'bg-infinity-blue-400', hex: '#60a5fa' },
        { shade: '500', class: 'bg-infinity-blue-500', hex: '#3b82f6' },
        { shade: '600', class: 'bg-infinity-blue-600', hex: '#2563eb' },
        { shade: '700', class: 'bg-infinity-blue-700', hex: '#1d4ed8' },
        { shade: '800', class: 'bg-infinity-blue-800', hex: '#1e40af' },
        { shade: '900', class: 'bg-infinity-blue-900', hex: '#1e3a8a' },
      ]
    },
    {
      name: 'Infinity Purple',
      colors: [
        { shade: '50', class: 'bg-infinity-purple-50', hex: '#faf5ff' },
        { shade: '100', class: 'bg-infinity-purple-100', hex: '#f3e8ff' },
        { shade: '200', class: 'bg-infinity-purple-200', hex: '#e9d5ff' },
        { shade: '300', class: 'bg-infinity-purple-300', hex: '#d8b4fe' },
        { shade: '400', class: 'bg-infinity-purple-400', hex: '#c084fc' },
        { shade: '500', class: 'bg-infinity-purple-500', hex: '#a855f7' },
        { shade: '600', class: 'bg-infinity-purple-600', hex: '#9333ea' },
        { shade: '700', class: 'bg-infinity-purple-700', hex: '#7c3aed' },
        { shade: '800', class: 'bg-infinity-purple-800', hex: '#6b21a8' },
        { shade: '900', class: 'bg-infinity-purple-900', hex: '#581c87' },
      ]
    },
    {
      name: 'Knowledge Gold',
      colors: [
        { shade: '50', class: 'bg-knowledge-gold-50', hex: '#fffbeb' },
        { shade: '100', class: 'bg-knowledge-gold-100', hex: '#fef3c7' },
        { shade: '200', class: 'bg-knowledge-gold-200', hex: '#fde68a' },
        { shade: '300', class: 'bg-knowledge-gold-300', hex: '#fcd34d' },
        { shade: '400', class: 'bg-knowledge-gold-400', hex: '#fbbf24' },
        { shade: '500', class: 'bg-knowledge-gold-500', hex: '#f59e0b' },
        { shade: '600', class: 'bg-knowledge-gold-600', hex: '#d97706' },
        { shade: '700', class: 'bg-knowledge-gold-700', hex: '#b45309' },
        { shade: '800', class: 'bg-knowledge-gold-800', hex: '#92400e' },
        { shade: '900', class: 'bg-knowledge-gold-900', hex: '#78350f' },
      ]
    }
  ];

  return (
    <div className="space-y-8 p-8">
      <div className="text-center mb-8">
        <Logo size="lg" variant="full" />
        <p className="mt-4 text-lg text-neural-gray-600">Brand Identity System</p>
      </div>

      {colorPalette.map((palette) => (
        <div key={palette.name} className="space-y-3">
          <h3 className="text-xl font-semibold text-neural-gray-900">{palette.name}</h3>
          <div className="grid grid-cols-10 gap-2">
            {palette.colors.map((color) => (
              <div key={color.shade} className="space-y-2">
                <div 
                  className={cn(color.class, 'h-16 rounded-lg border border-neural-gray-200')}
                  title={`${palette.name} ${color.shade} - ${color.hex}`}
                />
                <div className="text-center">
                  <div className="text-xs font-medium text-neural-gray-700">{color.shade}</div>
                  <div className="text-xs text-neural-gray-500">{color.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Typography Scale Component
export const TypographyScale: React.FC = () => {
  return (
    <div className="space-y-8 p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-neural-gray-900 mb-2">Typography System</h2>
        <p className="text-lg text-neural-gray-600">Inter Font Family</p>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-6xl font-black text-neural-gray-900 mb-2">Heading 1</h1>
          <code className="text-sm text-neural-gray-500">text-6xl font-black</code>
        </div>

        <div>
          <h2 className="text-5xl font-bold text-neural-gray-900 mb-2">Heading 2</h2>
          <code className="text-sm text-neural-gray-500">text-5xl font-bold</code>
        </div>

        <div>
          <h3 className="text-4xl font-bold text-neural-gray-900 mb-2">Heading 3</h3>
          <code className="text-sm text-neural-gray-500">text-4xl font-bold</code>
        </div>

        <div>
          <h4 className="text-3xl font-semibold text-neural-gray-900 mb-2">Heading 4</h4>
          <code className="text-sm text-neural-gray-500">text-3xl font-semibold</code>
        </div>

        <div>
          <h5 className="text-2xl font-semibold text-neural-gray-900 mb-2">Heading 5</h5>
          <code className="text-sm text-neural-gray-500">text-2xl font-semibold</code>
        </div>

        <div>
          <h6 className="text-xl font-medium text-neural-gray-900 mb-2">Heading 6</h6>
          <code className="text-sm text-neural-gray-500">text-xl font-medium</code>
        </div>

        <div>
          <p className="text-lg text-neural-gray-700 mb-2">
            Large body text for important content and descriptions that need emphasis.
          </p>
          <code className="text-sm text-neural-gray-500">text-lg</code>
        </div>

        <div>
          <p className="text-base text-neural-gray-700 mb-2">
            Regular body text for main content. This is the default text size for most content.
          </p>
          <code className="text-sm text-neural-gray-500">text-base</code>
        </div>

        <div>
          <p className="text-sm text-neural-gray-600 mb-2">
            Small text for captions, labels, and secondary information.
          </p>
          <code className="text-sm text-neural-gray-500">text-sm</code>
        </div>

        <div>
          <p className="text-xs text-neural-gray-500 mb-2">
            Extra small text for fine print and metadata.
          </p>
          <code className="text-sm text-neural-gray-500">text-xs</code>
        </div>
      </div>
    </div>
  );
};

// Neural Network Animation Component
export const NeuralAnimation: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" viewBox="0 0 400 400">
          {/* Animated neural network lines */}
          <defs>
            <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          
          {/* Neural connections */}
          <g stroke="url(#neuralGradient)" strokeWidth="2" fill="none" opacity="0.6">
            <line x1="50" y1="100" x2="150" y2="200">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" />
            </line>
            <line x1="150" y1="50" x2="250" y2="150">
              <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
            </line>
            <line x1="250" y1="100" x2="350" y2="200">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
            </line>
            <line x1="100" y1="300" x2="200" y2="200">
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="4s" repeatCount="indefinite" />
            </line>
            <line x1="200" y1="300" x2="300" y2="200">
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.5s" repeatCount="indefinite" />
            </line>
          </g>
          
          {/* Neural nodes */}
          <g fill="url(#neuralGradient)">
            <circle cx="50" cy="100" r="4">
              <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="150" cy="50" r="4">
              <animate attributeName="r" values="4;7;4" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="250" cy="100" r="4">
              <animate attributeName="r" values="3;6;3" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="350" cy="200" r="4">
              <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="100" cy="300" r="4">
              <animate attributeName="r" values="3;6;3" dur="3.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="200" cy="200" r="5">
              <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="300" cy="200" r="4">
              <animate attributeName="r" values="3;6;3" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>
      </div>
    </div>
  );
};