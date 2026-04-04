'use client';

import { useState } from 'react';
import * as db from '@/lib/db';
import * as Types from '@/lib/types';
import { Button } from '@/components/ui/button';
import { UpdateBatchModal } from './update-batch-modal';

interface ProductionBatchCardProps {
  batch: Types.ProductionBatchWithDetails;
}

export function ProductionBatchCard({ batch }: ProductionBatchCardProps) {
  const [currentBatch, setCurrentBatch] = useState(batch);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const handleStatusChange = async (newStatus: Types.BatchStatus) => {
    const success = await db.updateBatchStatus(currentBatch.id, newStatus);
    if (success) {
      setCurrentBatch({ ...currentBatch, status: newStatus });
    }
  };

  const getStatusColor = (status: Types.BatchStatus) => {
    const colors: Record<Types.BatchStatus, string> = {
      planned: 'bg-blue-100 text-blue-800 border-blue-300',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      quality_check: 'bg-purple-100 text-purple-800 border-purple-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[status];
  };

  const progressPercent = currentBatch.quantity_planned > 0
    ? (currentBatch.quantity_produced / currentBatch.quantity_planned) * 100
    : 0;

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{currentBatch.product?.nama}</h3>
            <p className="text-sm text-gray-600">Batch: {currentBatch.batch_number}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(currentBatch.status)}`}>
            {currentBatch.status.replace('_', ' ')}
          </span>
        </div>

        {/* Quantity Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm font-bold text-gray-900">
              {currentBatch.quantity_produced} / {currentBatch.quantity_planned}
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2">{progressPercent.toFixed(0)}% Complete</p>
        </div>

        {/* Dates */}
        <div className="space-y-2 mb-4 text-sm">
          {currentBatch.started_at && (
            <p className="text-gray-600">
              Started: {new Date(currentBatch.started_at).toLocaleDateString('id-ID')}
            </p>
          )}
          {currentBatch.completed_at && (
            <p className="text-gray-600">
              Completed: {new Date(currentBatch.completed_at).toLocaleDateString('id-ID')}
            </p>
          )}
          <p className="text-gray-600">
            Created: {new Date(currentBatch.created_at).toLocaleDateString('id-ID')}
          </p>
        </div>

        {/* Notes */}
        {currentBatch.notes && (
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-900">{currentBatch.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {currentBatch.status === 'planned' && (
            <Button
              onClick={() => handleStatusChange('in_progress')}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-sm"
            >
              Start Production
            </Button>
          )}

          {currentBatch.status === 'in_progress' && (
            <>
              <Button
                onClick={() => setShowUpdateModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm"
              >
                Update Quantity
              </Button>
              <Button
                onClick={() => handleStatusChange('quality_check')}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm"
              >
                To QC
              </Button>
            </>
          )}

          {currentBatch.status === 'quality_check' && (
            <Button
              onClick={() => handleStatusChange('completed')}
              className="bg-green-500 hover:bg-green-600 text-white font-bold text-sm"
            >
              Mark Complete
            </Button>
          )}
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <UpdateBatchModal
          batch={currentBatch}
          onClose={() => setShowUpdateModal(false)}
          onUpdate={(newQuantity) => {
            setCurrentBatch({ ...currentBatch, quantity_produced: newQuantity });
            setShowUpdateModal(false);
          }}
        />
      )}
    </>
  );
}
