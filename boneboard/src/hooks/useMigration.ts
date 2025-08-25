// React hook for managing database migration
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { MigrationStatus } from '../services/migrationService';

interface UseMigrationReturn {
  status: MigrationStatus | null;
  isLoading: boolean;
  error: string | null;
  isDatabaseReady: boolean;
  runMigration: () => Promise<void>;
  clearLocalStorage: () => Promise<void>;
  restoreFromBackup: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export const useMigration = (): UseMigrationReturn => {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);

  // Check if database is ready
  const checkDatabaseReady = useCallback(async () => {
    try {
      const response = await api.migration.checkDatabaseReady();
      setIsDatabaseReady(response.success && response.data === true);
    } catch (err) {
      setIsDatabaseReady(false);
    }
  }, []);

  // Get migration status
  const refreshStatus = useCallback(async () => {
    try {
      const response = await api.migration.getStatus();
      if (response.success && response.data) {
        setStatus(response.data);
      }
    } catch (err) {
      console.error('Error getting migration status:', err);
    }
  }, []);

  // Run full migration
  const runMigration = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.migration.runFullMigration();
      if (response.success && response.data) {
        setStatus(response.data);
        if (response.data.isComplete) {
          // Migration completed successfully
          console.log('Migration completed successfully');
        }
      } else {
        setError(api.utils.handleApiError(response.error || 'Migration failed'));
      }
    } catch (err) {
      setError(api.utils.handleApiError(err instanceof Error ? err.message : 'Migration failed'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear localStorage after successful migration
  const clearLocalStorage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.migration.clearLocalStorage();
      if (!response.success) {
        setError(api.utils.handleApiError(response.error || 'Failed to clear localStorage'));
      }
    } catch (err) {
      setError(api.utils.handleApiError(err instanceof Error ? err.message : 'Failed to clear localStorage'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restore from backup
  const restoreFromBackup = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.migration.restoreFromBackup();
      if (!response.success) {
        setError(api.utils.handleApiError(response.error || 'Failed to restore from backup'));
      }
    } catch (err) {
      setError(api.utils.handleApiError(err instanceof Error ? err.message : 'Failed to restore from backup'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkDatabaseReady();
    refreshStatus();
  }, [checkDatabaseReady, refreshStatus]);

  return {
    status,
    isLoading,
    error,
    isDatabaseReady,
    runMigration,
    clearLocalStorage,
    restoreFromBackup,
    refreshStatus
  };
};
