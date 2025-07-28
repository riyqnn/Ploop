import React from 'react';
import specialImage from '/spcial-image1.svg';

function About() {
  return (
    <div className="bg-white min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-7xl w-full flex flex-col md:flex-row items-center md:justify-center md:items-center gap-12 min-h-screen">
        {/* Left Side Text */}
        <div className="md:w-1/2">
          <h1 className="text-[#0a1a4f] font-extrabold text-3xl md:text-5xl leading-tight mb-6">
            Pinpoint Locations and<br />
            Start Your Property Analysis
          </h1>
          <p className="text-[#4a4a4a] text-base md:text-lg max-w-md mb-10">
            Have a specific location in mind? <strong className="font-extrabold">Ploop</strong> simplifies your property exploration with powerful, spatial-data-driven search capabilities.
          </p>
        </div>

        {/* Right Side Image */}
        <div className="md:w-1/2 flex justify-center md:justify-end">
          <div className="relative w-full max-w-lg lg:max-w-xl">
            {/* Background Box */}
            <div className="absolute top-[-80px] left-[200px] w-[65%] h-[130%] bg-[#e6ebff] rounded-r-3xl z-0"></div>

            {/* Image */}
            <img
              src={specialImage}
              alt="Modern building illustration"
              className="w-full h-auto opacity-95 z-10 relative"
              style={{ background: 'white', mixBlendMode: 'multiply' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
