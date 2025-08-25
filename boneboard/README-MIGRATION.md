# BoneBoard PostgreSQL Migration Guide

## Overview

This guide covers the complete migration from localStorage to PostgreSQL for the BoneBoard application. The migration system provides a robust, scalable database backend for all user data.

## Prerequisites

1. **Heroku PostgreSQL Database**
   - Create a Heroku app with PostgreSQL addon
   - Get your `DATABASE_URL` from Heroku dashboard

2. **Environment Setup**
   - Add `DATABASE_URL` to your `.env` file
   - Set `NODE_ENV=production` for SSL connections

## Database Schema

The PostgreSQL schema includes:
- **Users**: Core user accounts with wallet addresses
- **Freelancer Profiles**: Complete freelancer information and ratings
- **Service Packages**: Tiered service offerings (Basic, Standard, Premium)
- **Job Listings**: Job postings with expiration and payment tracking
- **Projects**: Project listings with verification status
- **Messages/Conversations**: Real-time messaging system
- **Reviews**: Freelancer ratings and feedback
- **Applications**: Job application tracking

## Migration Process

### 1. Database Setup

```bash
# Install PostgreSQL client
npm install pg @types/pg

# Run the schema creation
psql $DATABASE_URL < database/schema.sql
```

### 2. Environment Configuration

Update your `.env` file:
```env
DATABASE_URL=your_heroku_postgres_connection_string_here
NODE_ENV=production
```

### 3. Run Migration

The migration can be run through the UI or programmatically:

#### Using Migration Dashboard (Recommended)
1. Navigate to the Migration Dashboard component
2. Check database connection status
3. Click "Run Migration" to start the process
4. Monitor progress and handle any errors
5. Optionally clear localStorage after successful migration

#### Programmatic Migration
```typescript
import { migrationService } from './services/migrationService';

// Check if database is ready
const isReady = await migrationService.isDatabaseReady();

// Run full migration
const status = await migrationService.runFullMigration();

// Clear localStorage after successful migration
if (status.isComplete) {
  await migrationService.clearLocalStorageData();
}
```

## API Integration

The new API layer provides seamless integration:

```typescript
import { api } from './api';

// Freelancer operations
const profile = await api.freelancer.createProfile(walletAddress, profileData);
const profiles = await api.freelancer.getAllProfiles({ category: 'Development' });

// Job operations  
const job = await api.job.createJob(walletAddress, jobData);
const jobs = await api.job.getAllJobs({ category: 'Development' });

// Messaging
const conversation = await api.messaging.createConversation(wallet1, wallet2);
const message = await api.messaging.sendMessage(conversationId, senderWallet, content);
```

## Fallback System

The API includes automatic fallback to localStorage if the database is unavailable:

```typescript
// Automatically uses database or localStorage
const data = await api.utils.withFallback(
  () => api.freelancer.getAllProfiles(),
  () => FreelancerService.getAllFreelancers(),
  'Failed to load profiles'
);
```

## Migration Features

### Progress Tracking
- Real-time migration status
- Individual component progress (freelancers, jobs, projects, messages, reviews)
- Error tracking and reporting

### Data Integrity
- Duplicate detection and prevention
- Data validation during migration
- Backup creation before migration

### Error Handling
- Comprehensive error logging
- Individual item error tracking
- Rollback capabilities with backup restoration

### Performance Optimization
- Connection pooling for high-traffic scenarios
- Batch operations for large datasets
- Optimized queries with proper indexing

## Post-Migration

### 1. Verify Data Integrity
- Check that all profiles migrated correctly
- Verify job listings and applications
- Test messaging functionality
- Confirm project data

### 2. Update Frontend Components
Replace localStorage calls with API calls:

```typescript
// Before
const profiles = FreelancerService.getAllFreelancers();

// After  
const response = await api.freelancer.getAllProfiles();
const profiles = response.success ? response.data : [];
```

### 3. Performance Monitoring
- Monitor database connection health
- Track API response times
- Monitor error rates

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify `DATABASE_URL` is correct
   - Check Heroku PostgreSQL addon status
   - Ensure SSL is enabled for production

2. **Migration Errors**
   - Check individual error messages in migration status
   - Verify data format in localStorage
   - Use backup restoration if needed

3. **API Errors**
   - Check network connectivity
   - Verify database schema is up to date
   - Monitor Heroku logs for server errors

### Recovery Options

1. **Restore from Backup**
   ```typescript
   await migrationService.restoreFromBackup();
   ```

2. **Partial Re-migration**
   ```typescript
   // Re-run specific migrations
   await freelancerDatabaseService.migrateFromLocalStorage();
   await jobDatabaseService.migrateFromLocalStorage();
   ```

## Security Considerations

- All database queries use parameterized statements
- SSL connections enforced in production
- User data isolated by wallet address
- No sensitive data in localStorage backup

## Performance Benefits

After migration, you'll experience:
- **Faster Load Times**: Optimized database queries
- **Better Reliability**: No localStorage quota limits
- **Real-time Features**: Live messaging and notifications
- **Scalability**: Handles thousands of users
- **Data Persistence**: No data loss on browser clear

## Support

For migration issues:
1. Check the Migration Dashboard for detailed error messages
2. Review Heroku logs for database connection issues
3. Use the backup restoration feature if data is lost
4. Contact support with specific error messages

---

**Note**: Always test the migration process in a development environment before running in production.
