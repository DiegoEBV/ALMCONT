import React, { Suspense, lazy } from 'react';

// Loading component for charts
const ChartLoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <div className="ml-2 text-sm text-gray-600">Cargando gráfico...</div>
  </div>
);

// Lazy load heavy chart components
export const LazyBarChart = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Bar })));
export const LazyLineChart = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Line })));
export const LazyDoughnutChart = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Doughnut })));
export const LazyPieChart = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Pie })));

// Recharts lazy components
export const LazyRechartsBarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
export const LazyRechartsLineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
export const LazyRechartsPieChart = lazy(() => import('recharts').then(module => ({ default: module.PieChart })));
export const LazyRechartsAreaChart = lazy(() => import('recharts').then(module => ({ default: module.AreaChart })));

// Wrapper components with Suspense
interface LazyChartWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyChartWrapper: React.FC<LazyChartWrapperProps> = ({ 
  children, 
  fallback = <ChartLoadingSpinner /> 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

// Pre-configured chart components
interface ChartProps {
  data: any;
  options?: any;
  [key: string]: any;
}

export const LazyBarChartComponent: React.FC<ChartProps> = (props) => (
  <LazyChartWrapper>
    <LazyBarChart {...props} />
  </LazyChartWrapper>
);

export const LazyLineChartComponent: React.FC<ChartProps> = (props) => (
  <LazyChartWrapper>
    <LazyLineChart {...props} />
  </LazyChartWrapper>
);

export const LazyDoughnutChartComponent: React.FC<ChartProps> = (props) => (
  <LazyChartWrapper>
    <LazyDoughnutChart {...props} />
  </LazyChartWrapper>
);

export const LazyPieChartComponent: React.FC<ChartProps> = (props) => (
  <LazyChartWrapper>
    <LazyPieChart {...props} />
  </LazyChartWrapper>
);

// Recharts components
export const LazyRechartsBarChartComponent: React.FC<ChartProps> = (props) => (
  <LazyChartWrapper>
    <LazyRechartsBarChart {...props} />
  </LazyChartWrapper>
);

export const LazyRechartsLineChartComponent: React.FC<ChartProps> = (props) => (
  <LazyChartWrapper>
    <LazyRechartsLineChart {...props} />
  </LazyChartWrapper>
);

export const LazyRechartsPieChartComponent: React.FC<ChartProps> = (props) => (
  <LazyChartWrapper>
    <LazyRechartsPieChart {...props} />
  </LazyChartWrapper>
);

export const LazyRechartsAreaChartComponent: React.FC<ChartProps> = (props) => (
  <LazyChartWrapper>
    <LazyRechartsAreaChart {...props} />
  </LazyChartWrapper>
);