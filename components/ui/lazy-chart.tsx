'use client';

import { lazy, Suspense } from 'react';
import { ChartSkeleton } from './loading-skeleton';

// Lazy load chart components for better performance
const LazyLineChart = lazy(() =>
  import('recharts').then(module => ({ default: module.LineChart })) as any
);

const LazyBarChart = lazy(() =>
  import('recharts').then(module => ({ default: module.BarChart })) as any
);

const LazyPieChart = lazy(() =>
  import('recharts').then(module => ({ default: module.PieChart })) as any
);

const LazyResponsiveContainer = lazy(() =>
  import('recharts').then(module => ({ default: module.ResponsiveContainer })) as any
);

const LazyXAxis = lazy(() =>
  import('recharts').then(module => ({ default: module.XAxis })) as any
);

const LazyYAxis = lazy(() =>
  import('recharts').then(module => ({ default: module.YAxis })) as any
);

const LazyCartesianGrid = lazy(() =>
  import('recharts').then(module => ({ default: module.CartesianGrid })) as any
);

const LazyTooltip = lazy(() =>
  import('recharts').then(module => ({ default: module.Tooltip })) as any
);

const LazyLegend = lazy(() =>
  import('recharts').then(module => ({ default: module.Legend })) as any
);

const LazyLine = lazy(() =>
  import('recharts').then(module => ({ default: module.Line })) as any
);

const LazyBar = lazy(() =>
  import('recharts').then(module => ({ default: module.Bar })) as any
);

const LazyPie = lazy(() =>
  import('recharts').then(module => ({ default: module.Pie })) as any
);

const LazyCell = lazy(() =>
  import('recharts').then(module => ({ default: module.Cell })) as any
);

// Wrapper components with Suspense
export function ResponsiveContainer({ children, ...props }: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyResponsiveContainer {...props}>
        {children}
      </LazyResponsiveContainer>
    </Suspense>
  );
}

export function LineChart({ children, ...props }: any) {
  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded" />}>
      <LazyLineChart {...props}>
        {children}
      </LazyLineChart>
    </Suspense>
  );
}

export function BarChart({ children, ...props }: any) {
  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded" />}>
      <LazyBarChart {...props}>
        {children}
      </LazyBarChart>
    </Suspense>
  );
}

export function PieChart({ children, ...props }: any) {
  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded" />}>
      <LazyPieChart {...props}>
        {children}
      </LazyPieChart>
    </Suspense>
  );
}

export function XAxis(props: any) {
  return (
    <Suspense fallback={null}>
      <LazyXAxis {...props} />
    </Suspense>
  );
}

export function YAxis(props: any) {
  return (
    <Suspense fallback={null}>
      <LazyYAxis {...props} />
    </Suspense>
  );
}

export function CartesianGrid(props: any) {
  return (
    <Suspense fallback={null}>
      <LazyCartesianGrid {...props} />
    </Suspense>
  );
}

export function Tooltip(props: any) {
  return (
    <Suspense fallback={null}>
      <LazyTooltip {...props} />
    </Suspense>
  );
}

export function Legend(props: any) {
  return (
    <Suspense fallback={null}>
      <LazyLegend {...props} />
    </Suspense>
  );
}

export function Line(props: any) {
  return (
    <Suspense fallback={null}>
      <LazyLine {...props} />
    </Suspense>
  );
}

export function Bar(props: any) {
  return (
    <Suspense fallback={null}>
      <LazyBar {...props} />
    </Suspense>
  );
}

export function Pie(props: any) {
  return (
    <Suspense fallback={null}>
      <LazyPie {...props} />
    </Suspense>
  );
}

export function Cell(props: any) {
  return (
    <Suspense fallback={null}>
      <LazyCell {...props} />
    </Suspense>
  );
}

// Progressive loading wrapper for heavy components
export function ProgressiveChart({ 
  children, 
  fallback, 
  delay = 100 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
  delay?: number;
}) {
  return (
    <Suspense fallback={fallback || <ChartSkeleton />}>
      <div style={{ minHeight: '300px' }}>
        {children}
      </div>
    </Suspense>
  );
}

// Intersection Observer for lazy chart loading
export function LazyLoadChart({ 
  children, 
  threshold = 0.1 
}: { 
  children: React.ReactNode; 
  threshold?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className="min-h-[300px]">
      {isVisible ? (
        <Suspense fallback={<ChartSkeleton />}>
          {children}
        </Suspense>
      ) : (
        <ChartSkeleton />
      )}
    </div>
  );
}

// Add missing imports
import { useState, useRef, useEffect } from 'react';