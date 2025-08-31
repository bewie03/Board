#!/usr/bin/env python3
"""
BoneBoard Database Cleaner
Clears all job listings, project listings, and funding data from the database
"""

import psycopg2
import sys

# Database connection URL
DATABASE_URL = "postgres://u94m20d9lk1e7b:p73a59938021d84383fb460ad5c478003087a16d6038c9e19d6470d2400f1401e@c3v5n5ajfopshl.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d6nclr86s438p6"

def connect_to_database():
    """Connect to the PostgreSQL database"""
    try:
        print("🔌 Connecting to BoneBoard database...")
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Connected successfully")
        return conn
    except ImportError as e:
        print(f"❌ psycopg2 not installed: {e}")
        print("💡 Install with: pip install psycopg2-binary")
        return None
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def table_exists(cursor, table_name):
    """Check if a table exists in the database"""
    try:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = %s
            );
        """, (table_name,))
        return cursor.fetchone()[0]
    except Exception:
        return False

def get_table_counts(cursor):
    """Get current record counts for all tables"""
    tables = {
        'job_listings': 'SELECT COUNT(*) FROM job_listings',
        'projects': 'SELECT COUNT(*) FROM projects', 
        'project_fundings': 'SELECT COUNT(*) FROM project_fundings',
        'funding_contributions': 'SELECT COUNT(*) FROM funding_contributions'
    }
    
    counts = {}
    for table_name, query in tables.items():
        if table_exists(cursor, table_name):
            try:
                cursor.execute(query)
                count = cursor.fetchone()[0]
                counts[table_name] = count
            except Exception as e:
                print(f"⚠️  Could not get count for {table_name}: {e}")
                counts[table_name] = 0
        else:
            print(f"ℹ️  Table {table_name} does not exist, skipping")
            counts[table_name] = 0
    
    return counts

def clear_job_listings(cursor):
    """Clear all job listings"""
    print("\n🗑️  Clearing job listings...")
    if not table_exists(cursor, 'job_listings'):
        print("ℹ️  job_listings table does not exist, skipping")
        return 0
    try:
        cursor.execute("DELETE FROM job_listings")
        deleted_count = cursor.rowcount
        print(f"✅ Deleted {deleted_count} job listings")
        return deleted_count
    except Exception as e:
        print(f"❌ Error clearing job listings: {e}")
        cursor.connection.rollback()
        return 0

def clear_funding_data(cursor):
    """Clear all funding-related data"""
    print("\n💰 Clearing funding data...")
    total_deleted = 0
    
    # Clear funding contributions first (foreign key dependency)
    if table_exists(cursor, 'funding_contributions'):
        try:
            cursor.execute("DELETE FROM funding_contributions")
            contributions_deleted = cursor.rowcount
            print(f"✅ Deleted {contributions_deleted} funding contributions")
            total_deleted += contributions_deleted
        except Exception as e:
            print(f"⚠️  Error clearing funding contributions: {e}")
            cursor.connection.rollback()
    else:
        print("ℹ️  funding_contributions table does not exist, skipping")
    
    # Clear project fundings
    if table_exists(cursor, 'project_fundings'):
        try:
            cursor.execute("DELETE FROM project_fundings")
            fundings_deleted = cursor.rowcount
            print(f"✅ Deleted {fundings_deleted} project fundings")
            total_deleted += fundings_deleted
        except Exception as e:
            print(f"⚠️  Error clearing project fundings: {e}")
            cursor.connection.rollback()
    else:
        print("ℹ️  project_fundings table does not exist, skipping")
    
    return total_deleted

def clear_projects(cursor):
    """Clear all project listings"""
    print("\n📁 Clearing project listings...")
    if not table_exists(cursor, 'projects'):
        print("ℹ️  projects table does not exist, skipping")
        return 0
    try:
        cursor.execute("DELETE FROM projects")
        deleted_count = cursor.rowcount
        print(f"✅ Deleted {deleted_count} projects")
        return deleted_count
    except Exception as e:
        print(f"❌ Error clearing projects: {e}")
        cursor.connection.rollback()
        return 0

def reset_sequences(cursor):
    """Reset auto-increment sequences for clean IDs"""
    print("\n🔄 Resetting ID sequences...")
    
    # Get actual sequence names from database
    try:
        cursor.execute("""
            SELECT sequence_name 
            FROM information_schema.sequences 
            WHERE sequence_schema = 'public'
        """)
        sequences = [row[0] for row in cursor.fetchall()]
        
        if not sequences:
            print("ℹ️  No sequences found to reset")
            return
            
        for seq_name in sequences:
            try:
                cursor.execute(f"ALTER SEQUENCE {seq_name} RESTART WITH 1")
                print(f"✅ Reset sequence: {seq_name}")
            except Exception as e:
                print(f"⚠️  Could not reset sequence {seq_name}: {e}")
                
    except Exception as e:
        print(f"⚠️  Could not get sequence list: {e}")

def main():
    """Main execution function"""
    print("🧹 BoneBoard Database Cleaner")
    print("=" * 50)
    print("⚠️  WARNING: This will DELETE ALL data from:")
    print("   • Job Listings")
    print("   • Project Listings") 
    print("   • Project Fundings")
    print("   • Funding Contributions")
    print("=" * 50)
    
    # Confirmation prompt
    confirm = input("\n❓ Are you sure you want to proceed? Type 'YES' to continue: ")
    if confirm != 'YES':
        print("❌ Operation cancelled")
        return
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        sys.exit(1)
    
    try:
        cursor = conn.cursor()
        
        # Get initial counts
        print("\n📊 Current database state:")
        initial_counts = get_table_counts(cursor)
        for table, count in initial_counts.items():
            print(f"   {table}: {count} records")
        
        if sum(initial_counts.values()) == 0:
            print("\n✅ Database is already empty!")
            return
        
        # Clear data
        jobs_deleted = clear_job_listings(cursor)
        funding_deleted = clear_funding_data(cursor)
        projects_deleted = clear_projects(cursor)
        
        # Reset sequences for clean start
        reset_sequences(cursor)
        
        # Commit changes
        conn.commit()
        
        # Verify cleanup
        print("\n🔍 Verifying cleanup...")
        final_counts = get_table_counts(cursor)
        for table, count in final_counts.items():
            if count == 0:
                print(f"✅ {table}: {count} records (cleared)")
            else:
                print(f"⚠️  {table}: {count} records (not fully cleared)")
        
        # Summary
        total_deleted = jobs_deleted + funding_deleted + projects_deleted
        print("\n" + "=" * 50)
        print("📊 CLEANUP SUMMARY:")
        print(f"   Job listings deleted: {jobs_deleted}")
        print(f"   Projects deleted: {projects_deleted}")
        print(f"   Funding records deleted: {funding_deleted}")
        print(f"   Total records deleted: {total_deleted}")
        
        if sum(final_counts.values()) == 0:
            print("\n🎉 Database successfully cleared!")
            print("   Ready for fresh job and project postings.")
        else:
            print("\n⚠️  Some records may not have been cleared.")
            
    except Exception as e:
        print(f"\n❌ Error during cleanup: {e}")
        conn.rollback()
        sys.exit(1)
        
    finally:
        cursor.close()
        conn.close()
        print("\n🔌 Database connection closed")

if __name__ == "__main__":
    main()
