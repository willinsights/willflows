import { useState, useEffect } from 'react';

const TOUR_STORAGE_KEY = 'willflow_tour_completed';

export function useProductTour() {
  const [showTour, setShowTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (completed === 'true') {
      setTourCompleted(true);
    } else {
      // Show tour after a short delay on first visit
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setTourCompleted(true);
    setShowTour(false);
  };

  const skipTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setTourCompleted(true);
    setShowTour(false);
  };

  const restartTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setTourCompleted(false);
    setShowTour(true);
  };

  return {
    showTour,
    tourCompleted,
    completeTour,
    skipTour,
    restartTour,
  };
}
