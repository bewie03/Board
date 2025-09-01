#!/usr/bin/env python3
"""
Fix Job Cascade Delete Constraints
Updates job_listings foreign key constraints to CASCADE delete when project is deleted
This ensures that when a project is deleted (especially scam projects), all associated jobs are also removed
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

def fix_cascade_constraints(conn):
    """Fix job_listings foreign key constraints to CASCADE delete"""
    try:
        cursor = conn.cursor()
        
        print("\n🔧 Fixing job_listings foreign key constraints...")
        
        # First, check what columns actually exist
        print("📝 Checking existing columns...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'job_listings' 
            AND column_name IN ('project_id', 'selected_project_id');
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"  Found columns: {existing_columns}")
        
        # Drop existing foreign key constraints
        print("📝 Dropping existing constraints...")
        cursor.execute("""
            ALTER TABLE job_listings DROP CONSTRAINT IF EXISTS job_listings_project_id_fkey;
        """)
        
        # Only handle selected_project_id if it exists
        if 'selected_project_id' in existing_columns:
            cursor.execute("""
                ALTER TABLE job_listings DROP CONSTRAINT IF EXISTS job_listings_selected_project_id_fkey;
            """)
        
        # Add new CASCADE constraints
        print("📝 Adding CASCADE constraints...")
        cursor.execute("""
            ALTER TABLE job_listings 
            ADD CONSTRAINT job_listings_project_id_fkey 
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        """)
        
        # Only add selected_project_id constraint if column exists
        if 'selected_project_id' in existing_columns:
            cursor.execute("""
                ALTER TABLE job_listings 
                ADD CONSTRAINT job_listings_selected_project_id_fkey 
                FOREIGN KEY (selected_project_id) REFERENCES projects(id) ON DELETE CASCADE;
            """)
        
        # Commit the changes
        conn.commit()
        print("✅ Foreign key constraints updated successfully")
        
        # Verify the constraints
        print("\n🔍 Verifying constraints...")
        cursor.execute("""
            SELECT 
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
                JOIN information_schema.referential_constraints AS rc
                  ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name = 'job_listings'
              AND kcu.column_name IN ('project_id', 'selected_project_id');
        """)
        
        results = cursor.fetchall()
        
        print("\n📊 Current constraints:")
        for row in results:
            constraint_name, table_name, column_name, foreign_table, foreign_column, delete_rule = row
            print(f"  • {column_name} → {foreign_table}.{foreign_column} (DELETE: {delete_rule})")
        
        cursor.close()
        
        # Verify CASCADE is working
        cascade_working = all(row[5] == 'CASCADE' for row in results if row[2] in ['project_id', 'selected_project_id'])
        
        if cascade_working:
            print("\n✅ CASCADE constraints are properly configured!")
            print("🎯 When a project is deleted, all associated jobs will be automatically deleted")
        else:
            print("\n⚠️  Some constraints may not be CASCADE - please check manually")
            
        return True
        
    except Exception as e:
        print(f"❌ Error updating constraints: {e}")
        conn.rollback()
        return False

def main():
    """Main function"""
    print("🚀 BoneBoard Job Cascade Delete Fix")
    print("=" * 50)
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        sys.exit(1)
    
    try:
        # Fix the constraints
        success = fix_cascade_constraints(conn)
        
        if success:
            print("\n🎉 Database update completed successfully!")
            print("\n📋 Summary:")
            print("  • job_listings.project_id now CASCADE deletes")
            print("  • job_listings.selected_project_id now CASCADE deletes")
            print("  • When projects are deleted, associated jobs are automatically removed")
            print("  • This prevents orphaned jobs from scam projects")
        else:
            print("\n❌ Database update failed!")
            sys.exit(1)
            
    finally:
        conn.close()
        print("\n🔌 Database connection closed")

if __name__ == "__main__":
    main()
