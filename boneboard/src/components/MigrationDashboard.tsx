// Migration dashboard component for managing database migration
import React from 'react';
import { useMigration } from '../hooks/useMigration';
import { FiDatabase, FiUpload, FiCheck, FiX, FiLoader, FiTrash2, FiRotateCcw } from 'react-icons/fi';

const MigrationDashboard: React.FC = () => {
  const {
    status,
    isLoading,
    error,
    isDatabaseReady,
    runMigration,
    clearLocalStorage,
    restoreFromBackup,
    refreshStatus
  } = useMigration();

  const getProgressPercentage = () => {
    if (!status) return 0;
    const total = status.freelancers.total + status.jobs.total + status.projects.total + status.messages.total + status.reviews.total;
    const migrated = status.freelancers.migrated + status.jobs.migrated + status.projects.migrated + status.messages.migrated + status.reviews.migrated;
    return total > 0 ? Math.round((migrated / total) * 100) : 0;
  };

  const StatusCard: React.FC<{ title: string; data: { total: number; migrated: number; errors: number } }> = ({ title, data }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total:</span>
          <span className="font-medium">{data.total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Migrated:</span>
          <span className="font-medium text-green-600">{data.migrated}</span>
        </div>
        {data.errors > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Errors:</span>
            <span className="font-medium text-red-600">{data.errors}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-6">
        <div className="flex items-center gap-3 mb-4">
          <FiDatabase className="text-2xl" />
          <h1 className="text-2xl font-bold">Database Migration</h1>
        </div>
        <p className="text-blue-100">
          Migrate your data from localStorage to PostgreSQL for better performance and reliability.
        </p>
      </div>

      {/* Database Status */}
      <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Database Status</h2>
          <button
            onClick={refreshStatus}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            title="Refresh Status"
          >
            <FiRotateCcw />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {isDatabaseReady ? (
            <>
              <FiCheck className="text-green-500 text-xl" />
              <span className="text-green-700 font-medium">Database Connected</span>
            </>
          ) : (
            <>
              <FiX className="text-red-500 text-xl" />
              <span className="text-red-700 font-medium">Database Not Available</span>
            </>
          )}
        </div>
      </div>

      {/* Migration Progress */}
      {status && (
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Migration Progress</h2>
            {status.isComplete && (
              <div className="flex items-center gap-2 text-green-600">
                <FiCheck />
                <span className="font-medium">Complete</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Overall Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatusCard title="Freelancers" data={status.freelancers} />
            <StatusCard title="Jobs" data={status.jobs} />
            <StatusCard title="Projects" data={status.projects} />
            <StatusCard title="Messages" data={status.messages} />
            <StatusCard title="Reviews" data={status.reviews} />
          </div>

          {/* Errors */}
          {status.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Migration Errors</h4>
              <div className="space-y-1 text-sm text-red-700 max-h-32 overflow-y-auto">
                {status.errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <FiX className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <FiX className="text-red-500 text-xl mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Migration Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Run Migration */}
          <button
            onClick={runMigration}
            disabled={!isDatabaseReady || isLoading}
            className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <FiLoader className="animate-spin" />
            ) : (
              <FiUpload />
            )}
            <span>{isLoading ? 'Migrating...' : 'Run Migration'}</span>
          </button>

          {/* Clear localStorage */}
          <button
            onClick={clearLocalStorage}
            disabled={!status?.isComplete || isLoading}
            className="flex items-center justify-center gap-3 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <FiTrash2 />
            <span>Clear localStorage</span>
          </button>

          {/* Restore Backup */}
          <button
            onClick={restoreFromBackup}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <FiRotateCcw />
            <span>Restore Backup</span>
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-sm text-gray-600 space-y-1">
          <p><strong>Run Migration:</strong> Transfer all data from localStorage to PostgreSQL database.</p>
          <p><strong>Clear localStorage:</strong> Remove local data after successful migration (creates backup first).</p>
          <p><strong>Restore Backup:</strong> Restore data from backup if something goes wrong.</p>
        </div>
      </div>
    </div>
  );
};

export default MigrationDashboard;
