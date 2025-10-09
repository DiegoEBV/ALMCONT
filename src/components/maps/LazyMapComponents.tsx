import React, { Suspense, lazy } from 'react';

// Loading component for maps
const MapLoadingSpinner = () => (
  <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <div className="mt-2 text-sm text-gray-600">Cargando mapa...</div>
    </div>
  </div>
);

// Lazy load heavy map components
export const LazyMapContainer = lazy(() => import('react-leaflet').then(module => ({ default: module.MapContainer })));
export const LazyTileLayer = lazy(() => import('react-leaflet').then(module => ({ default: module.TileLayer })));
export const LazyMarker = lazy(() => import('react-leaflet').then(module => ({ default: module.Marker })));
export const LazyPopup = lazy(() => import('react-leaflet').then(module => ({ default: module.Popup })));
export const LazyCircle = lazy(() => import('react-leaflet').then(module => ({ default: module.Circle })));
export const LazyPolygon = lazy(() => import('react-leaflet').then(module => ({ default: module.Polygon })));
export const LazyPolyline = lazy(() => import('react-leaflet').then(module => ({ default: module.Polyline })));

// Wrapper component with Suspense
interface LazyMapWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const LazyMapWrapper: React.FC<LazyMapWrapperProps> = ({ 
  children, 
  fallback = <MapLoadingSpinner />,
  className = ""
}) => {
  return (
    <div className={className}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </div>
  );
};

// Pre-configured map components
interface MapProps {
  center?: [number, number];
  zoom?: number;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export const LazyMapComponent: React.FC<MapProps> = ({ 
  center = [51.505, -0.09], 
  zoom = 13, 
  style = { height: '400px', width: '100%' },
  className = "",
  children,
  ...props 
}) => (
  <LazyMapWrapper className={className}>
    <LazyMapContainer 
      center={center} 
      zoom={zoom} 
      style={style}
      {...props}
    >
      <LazyTileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </LazyMapContainer>
  </LazyMapWrapper>
);

// GPS Tracking specific map component
export const LazyGPSMap: React.FC<MapProps> = (props) => (
  <LazyMapWrapper>
    <LazyMapComponent {...props} />
  </LazyMapWrapper>
);