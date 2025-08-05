import React from 'react';
import { Logo } from './BrandElements';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  return (
    <header className={cn(
      'bg-white/95 backdrop-blur-md shadow-sm border-b border-neural-gray-200 sticky top-0 z-50',
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Logo size="sm" variant="default" />
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink href="#" active>Dashboard</NavLink>
            <NavLink href="#">Documents</NavLink>
            <NavLink href="#">Graph</NavLink>
            <NavLink href="#">Analytics</NavLink>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
            <Button variant="neural" size="sm">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

// Navigation Link Component
interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

const NavLink: React.FC<NavLinkProps> = ({ href, children, active = false, className }) => {
  return (
    <a 
      href={href}
      className={cn(
        'font-medium transition-colors duration-200 relative',
        active 
          ? 'text-infinity-blue-600' 
          : 'text-neural-gray-600 hover:text-infinity-blue-600',
        className
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-infinity-blue-600 rounded-full transform -translate-y-2" />
      )}
    </a>
  );
};

// Alternative compact header for authenticated users
export const CompactHeader: React.FC<HeaderProps> = ({ className }) => {
  return (
    <header className={cn(
      'bg-gradient-to-r from-infinity-blue-600 to-infinity-purple-600 text-white',
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold transform rotate-90">∞</div>
            <span className="font-bold text-lg">8Brain</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              Profile
            </Button>
            <Button variant="outline" size="sm" className="border-white text-white hover:bg-white hover:text-infinity-blue-600">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};