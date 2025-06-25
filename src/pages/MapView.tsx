
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MapView: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate back immediately when this route is accessed
    navigate(-1);
  }, [navigate]);

  return null;
};

export default MapView;
