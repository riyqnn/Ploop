import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import opportunitiesImage from '/opportunities-image.svg';

function LandingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [budgetRange, setBudgetRange] = useState('Budget Range');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Updated budget options with SUI currency
  const budgetOptions = [
    'Under 100 SUI',
    '100 - 200 SUI',
    '200 - 300 SUI',
    '300 - 500 SUI',
    'Above 500 SUI'
  ];

  const handleSearch = () => {
    console.log('Searching for:', searchTerm, 'Budget:', budgetRange);
    // Add your search logic here
  };

  return (
    <main className="relative min-h-screen bg-white overflow-hidden flex items-center justify-center">
      {/* Background Cityscape Illustration */}
      <div className="absolute inset-0 w-full h-full">
        <img 
          src={opportunitiesImage} 
          alt="Illustration of cityscape with various modern buildings, trees, clouds, and street elements in blue and white tones" 
          className="w-full h-full object-content"
        />
      </div>

      {/* Content Container */}
      <div className="relative top-[-100px] z-10 flex flex-col items-center justify-center w-full max-w-5xl px-4 sm:px-6 md:px-8 lg:px-12">
        
        {/* Header Section */}
        <div className="text-center mb-6 max-w-4xl">
          <h1 className="text-[#1E2A56] font-semibold text-2xl sm:text-3xl md:text-4xl lg:text-4xl leading-snug mb-3">
            Discover Verified{' '}
            <span className="font-extrabold bg-gradient-to-r from-[#1E2A56] to-[#4A5FBF] bg-clip-text text-transparent">
              Property Investments
            </span>{' '}
            Blockchain & Spatial Intelligence
          </h1>

          <p className="text-slate-600 text-sm sm:text-base md:text-lg mb-4 max-w-3xl mx-auto leading-relaxed">
            Get access to the most comprehensive spatial property data for smarter investments
          </p>

          {/* Search Section */}
          <div className="flex flex-col sm:flex-row max-w-3xl mx-auto bg-white rounded-2xl sm:rounded-full shadow-xl overflow-hidden border border-white/20 backdrop-blur-sm">
            {/* Search Input */}
            <div className="flex items-center flex-grow px-4 py-3 sm:py-2.5">
              <Search className="text-[#1E2A56] mr-2 flex-shrink-0" size={18} />
              <input
                className="w-full text-sm sm:text-base text-[#1E2A56] placeholder-[#8B9ACF] font-normal focus:outline-none bg-transparent"
                placeholder="Search for a location..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            {/* Budget Dropdown */}
            <div className="relative flex items-center border-t sm:border-t-0 sm:border-l border-[#E5E7EB] px-4 py-3 sm:py-2.5 z-30">
              <button
                type="button"
                className="flex items-center justify-between w-full text-sm sm:text-base text-[#1E2A56] font-normal hover:text-[#4A5FBF] transition-colors focus:outline-none"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
              >
                {budgetRange}
                <ChevronDown className={`ml-2 text-[#1E2A56] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} size={16} />
              </button>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-40 max-h-60 overflow-y-auto">
                  {budgetOptions.map((option, index) => (
                    <button
                      key={index}
                      className="block w-full text-left px-4 py-2.5 text-sm text-[#1E2A56] hover:bg-[#F8FAFF] transition-colors focus:outline-none focus:bg-[#F8FAFF]"
                      onClick={() => {
                        setBudgetRange(option);
                        setIsDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={budgetRange === option}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Search Button */}
            <button
              className="bg-[#1E2A56] text-white text-sm sm:text-base font-semibold tracking-wider uppercase px-6 py-3 sm:py-2.5 sm:rounded-r-full hover:bg-[#162146] transition-all duration-200 transform hover:scale-105 active:scale-95"
              onClick={handleSearch}
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default LandingPage;