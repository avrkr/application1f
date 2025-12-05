import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [interest, setInterest] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const navigate = useNavigate();

  const handleStart = (type) => {
    if (!isAdult) {
      alert('You must acknowledge that you are 18+ to continue.');
      return;
    }
    navigate(`/${type}`, { state: { interest } });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Welcome to iMingle</h1>
        
        <div className="mb-6">
          <label className="block text-left text-gray-700 mb-2 font-medium">Your Interests (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Music, Coding, Travel"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
          />
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          <input
            type="checkbox"
            id="age-check"
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            checked={isAdult}
            onChange={(e) => setIsAdult(e.target.checked)}
          />
          <label htmlFor="age-check" className="text-gray-600 text-sm">
            I acknowledge that I am 18+ years old.
          </label>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleStart('text')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
          >
            Text Chat
          </button>
          <button
            onClick={() => handleStart('video')}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
          >
            Video Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
