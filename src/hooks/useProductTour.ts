import { useState, useEffect } from 'react';

const TOUR_STORAGE_KEY = 'willflow_tour_completed';

export function useProductTour() {
  const [showTour, setShowTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    // Marcar como concluído por padrão — o tour passa a ser opt-in via Configurações.
    // Isto evita que o modal bloqueie o acesso ao app no primeiro login.
    if (completed !== 'true') {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }
    setTourCompleted(true);
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
