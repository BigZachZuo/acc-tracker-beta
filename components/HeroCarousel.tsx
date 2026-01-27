import React, { useState, useEffect } from 'react';

const IMAGES = [
  {
    url: "/assets/hero/slide-1.jpg",
    title: "OFFICIAL GT WORLD CHALLENGE",
    subtitle: "Experience the real atmosphere of the GT3 championship."
  },
  {
    url: "/assets/hero/slide-2.jpg",
    title: "LASER SCANNED CIRCUITS",
    subtitle: "Every curb, bump, and detail reproduced with millimeter precision."
  },
  {
    url: "/assets/hero/slide-3.jpg",
    title: "DOMINATE THE GRID",
    subtitle: "Compare your times with the best drivers in the world."
  },
  {
    url: "/assets/hero/slide-4.jpg",
    title: "DYNAMIC WEATHER & NIGHT",
    subtitle: "Adapt to 24-hour cycles and changing track conditions."
  }
];

const HeroCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % IMAGES.length);
    }, 6000); // Change every 6 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[400px] md:h-[500px] bg-slate-900 overflow-hidden border-b border-red-900/30">
      {/* Images */}
      {IMAGES.map((img, index) => (
        <div
          key={img.url}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
            <img 
              src={img.url} 
              alt="Racing Background" 
              className="w-full h-full object-cover object-center"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-transparent" />
        </div>
      ))}

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="max-w-2xl animate-fade-in-up">
                <div className="flex items-center gap-3 mb-4">
                    <span className="h-1 w-12 bg-red-600 rounded-full block"></span>
                    <span className="text-red-500 font-bold tracking-widest uppercase text-sm">Assetto Corsa Competizione</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter mb-4 leading-tight drop-shadow-2xl">
                    {IMAGES[currentIndex].title}
                </h1>
                <p className="text-xl md:text-2xl text-slate-300 font-light tracking-wide drop-shadow-lg">
                    {IMAGES[currentIndex].subtitle}
                </p>
            </div>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
        {IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'w-8 bg-red-600' : 'w-2 bg-slate-600 hover:bg-slate-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;