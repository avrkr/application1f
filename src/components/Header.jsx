import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-gray-900 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold text-xl">
            i
          </div>
          <span className="text-xl font-bold tracking-wider">iMingle</span>
        </Link>
      </div>
    </header>
  );
};

export default Header;
