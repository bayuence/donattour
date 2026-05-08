'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Safe icon component
const SafeIcon = ({ 
  emoji, 
  size = 20, 
  className = '' 
}: { 
  emoji: string; 
  size?: number; 
  className?: string; 
}) => (
  <div 
    className={`inline-flex items-center justify-center ${className}`}
    style={{ width: size, height: size }}
  >
    <span style={{ fontSize: size * 0.8 }}>{emoji}</span>
  </div>
);

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Send error to logging service in production
    // logErrorToService(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error!}
          resetError={this.resetError}
          errorInfo={this.state.errorInfo || undefined}
        />
      );
    }

    return this.props.children;
  }
}

// Default Error Fallback Component
function DefaultErrorFallback({ error, resetError, errorInfo }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <SafeIcon emoji="⚠️" size={32} className="text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-700">Oops! Terjadi Kesalahan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-red-50 border-red-200">
            <SafeIcon emoji="🐛" size={16} className="text-red-600" />
            <AlertDescription className="text-red-700">
              Aplikasi mengalami kesalahan yang tidak terduga. Tim teknis telah diberitahu dan akan segera memperbaikinya.
            </AlertDescription>
          </Alert>

          {isDevelopment && (
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Error Details (Development Mode):</h4>
                <pre className="text-sm text-red-600 whitespace-pre-wrap break-words">
                  {error.message}
                </pre>
              </div>

              {error.stack && (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Stack Trace:</h4>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {error.stack}
                  </pre>
                </div>
              )}

              {errorInfo?.componentStack && (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Component Stack:</h4>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={resetError} className="flex items-center gap-2">
              <SafeIcon emoji="🔄" size={16} />
              Coba Lagi
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
              className="flex items-center gap-2"
            >
              <SafeIcon emoji="🏠" size={16} />
              Kembali ke Dashboard
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Jika masalah terus berlanjut, silakan hubungi tim support.</p>
            <p className="mt-1">Error ID: {Date.now().toString(36)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Specific Error Fallbacks for different scenarios

export function APIErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Alert className="bg-red-50 border-red-200">
      <SafeIcon emoji="⚠️" size={16} className="text-red-600" />
      <AlertDescription className="text-red-700">
        <div className="space-y-2">
          <p className="font-semibold">Gagal memuat data</p>
          <p className="text-sm">{error.message}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={resetError}
            className="mt-2"
          >
            <SafeIcon emoji="🔄" size={12} />
            Coba Lagi
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function FormErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Alert className="bg-amber-50 border-amber-200">
      <SafeIcon emoji="⚠️" size={16} className="text-amber-600" />
      <AlertDescription className="text-amber-700">
        <div className="space-y-2">
          <p className="font-semibold">Terjadi kesalahan pada form</p>
          <p className="text-sm">{error.message}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={resetError}
            className="mt-2"
          >
            Reset Form
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function ChartErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <SafeIcon emoji="⚠️" size={48} className="text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Gagal Memuat Chart
        </h3>
        <p className="text-gray-500 mb-4 text-sm">
          {error.message}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={resetError}
        >
          <SafeIcon emoji="🔄" size={12} />
          Muat Ulang
        </Button>
      </CardContent>
    </Card>
  );
}

// Hook for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // TODO: Send to logging service
    // logErrorToService(error, errorInfo);
  };
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}