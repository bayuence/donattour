'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import { useAuth } from '@/lib/context/auth-context';
import * as Types from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ProductionBatchCard } from './production-batch-card';
import { CreateBatchModal } from './create-batch-modal';

export function ProductionDashboard() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Types.ProductionBatchWithDetails[]>([]);
  const [filter, setFilter] = useState<Types.BatchStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load batches
  useEffect(() => {
    const loadBatches = async () => {
      try {
        const status = filter === 'all' ? undefined : filter;
        const loadedBatches = await db.getProductionBatches(status);
        setBatches(loadedBatches);
      } catch (error) {
        console.error('Error loading batches:', error);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadBatches();
  }, [filter]);

  const handleBatchCreated = async () => {
    setShowCreateModal(false);
    const status = filter === 'all' ? undefined : filter;
    const loadedBatches = await db.getProductionBatches(status);
    setBatches(loadedBatches);
  };

  const statusCounts = {
    planned: batches.filter((b) => b.status === 'planned').length,
    in_progress: batches.filter((b) => b.status === 'in_progress').length,
    completed: batches.filter((b) => b.status === 'completed').length,
    quality_check: batches.filter((b) => b.status === 'quality_check').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Planned', count: statusCounts.planned, color: 'bg-blue-50 border-blue-200' },
          { label: 'In Progress', count: statusCounts.in_progress, color: 'bg-yellow-50 border-yellow-200' },
          { label: 'Quality Check', count: statusCounts.quality_check, color: 'bg-purple-50 border-purple-200' },
          { label: 'Completed', count: statusCounts.completed, color: 'bg-green-50 border-green-200' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} border rounded-lg p-4`}>
            <p className="text-sm text-gray-600">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filters & Create Button */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {(['planned', 'in_progress', 'quality_check', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                  filter === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white font-bold"
          >
            Create Batch
          </Button>
        </div>
      </div>

      {/* Batches Grid */}
      {batches.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center">
          <p className="text-gray-500">No production batches found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {batches.map((batch) => (
            <ProductionBatchCard key={batch.id} batch={batch} />
          ))}
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <CreateBatchModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleBatchCreated}
          userId={user?.id || ''}
        />
      )}
    </div>
  );
}
