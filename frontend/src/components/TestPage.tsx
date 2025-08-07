import React from 'react';

export const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Tailwind CSS Test</h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-700 mb-4">If you can see this styled properly, Tailwind is working!</p>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Test Button
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-red-200 p-4 rounded">Red Box</div>
          <div className="bg-green-200 p-4 rounded">Green Box</div>
          <div className="bg-blue-200 p-4 rounded">Blue Box</div>
        </div>
      </div>
    </div>
  );
};