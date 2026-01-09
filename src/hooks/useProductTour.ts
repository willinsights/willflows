import { useState, useEffect } from 'react';

const TOUR_STORAGE_KEY = 'willflow_tour_completed';

export function useProductTour() {
  const [showTour, setShowTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (completed === 'true') {
      setTourCompleted(true);
      setShowTour(false);
      return;
    }

    // Não abrir automaticamente: o tour deve ser acionado pelo utilizador (ex.: em Configurações)
    setTourCompleted(false);
    setShowTour(false);
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
