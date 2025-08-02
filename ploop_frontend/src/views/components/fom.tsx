import React, { useState } from "react";
import { ChevronDown, MapPin } from 'lucide-react';

interface FormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function Form({ onSubmit }: FormProps): JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(['Apartment', 'House', 'Shophouse']);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [searchLocation, setSearchLocation] = useState<string>('');

  const propertyTypes: string[] = [
    'Apartment',
    'House', 
    'Boarding House',
    'Shophouse',
    'Warehouse'
  ];

  const togglePropertyType = (type: string): void => {
    setSelectedPropertyTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSubmit(e as React.FormEvent<HTMLFormElement>);
  };

  const handleMinRangeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(e.target.value);
    setPriceRange([value, priceRange[1]]);
  };

  const handleMaxRangeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(e.target.value);
    setPriceRange([priceRange[0], value]);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchLocation(e.target.value);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm max-w-md w-full overflow-hidden">
      <div className="space-y-0">
        {/* Location Search */}
        <div className="flex items-center px-6 py-4 border-b border-slate-100">
          <MapPin className="text-[#1E2A56] mr-3 flex-shrink-0" size={18} />
          <input
            className="w-full text-sm text-[#1E2A56] placeholder-[#8B9ACF] font-normal focus:outline-none bg-transparent"
            placeholder="Find Location"
            type="text"
            value={searchLocation}
            onChange={handleLocationChange}
          />
        </div>

        {/* Criteria Dropdown */}
        <div className="relative">
          <button
            type="button"
            className="w-full flex items-center justify-between px-6 py-4 text-[#1E2A56] font-normal hover:bg-[#F8FAFF] transition-colors focus:outline-none border-b border-slate-100"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
          >
            Enter Your Criteria
            <ChevronDown 
              className={`text-[#1E2A56] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
              size={16} 
            />
          </button>
          
          {/* Dropdown Content */}
          {isDropdownOpen && (
            <div className="px-6 py-4 space-y-6 bg-[#F8FAFF] border-b border-slate-100">
              {/* Property Type */}
              <div>
                <p className="font-semibold text-[#1E2A56] mb-3 text-sm">Property Type:</p>
                <div className="flex flex-wrap gap-2">
                  {propertyTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => togglePropertyType(type)}
                      className={`text-xs rounded-full px-3 py-1.5 transition-all duration-200 ${
                        selectedPropertyTypes.includes(type)
                          ? 'bg-[#1E2A56] text-white shadow-sm'
                          : 'bg-white text-[#1E2A56] border border-slate-200 hover:border-[#1E2A56]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <p className="font-semibold text-[#1E2A56] mb-2 text-sm">Price Range</p>
                <p className="text-xs mb-3 text-slate-600">
                  Rentang Harga: {priceRange[0]} SUI - {priceRange[1]} SUI
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <input 
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      type="range" 
                      min="0" 
                      max="500" 
                      value={priceRange[0]}
                      onChange={handleMinRangeChange}
                      style={{
                        background: `linear-gradient(to right, #1E2A56 0%, #1E2A56 ${priceRange[0]/5}%, #e2e8f0 ${priceRange[0]/5}%, #e2e8f0 100%)`
                      }}
                    />
                  </div>
                  <div className="relative">
                    <input 
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      type="range" 
                      min="0" 
                      max="500" 
                      value={priceRange[1]}
                      onChange={handleMaxRangeChange}
                      style={{
                        background: `linear-gradient(to right, #e2e8f0 0%, #e2e8f0 ${priceRange[1]/5}%, #1E2A56 ${priceRange[1]/5}%, #1E2A56 100%)`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="p-6">
          <button
            className="w-full bg-[#1E2A56] text-white text-sm font-semibold tracking-wider uppercase py-3 rounded-xl hover:bg-[#162146] transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
            type="submit"
            onClick={handleSubmit}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

export default Form;