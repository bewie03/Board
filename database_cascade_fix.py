#!/usr/bin/env python3
"""
Database CASCADE Fix Script
============================

This script connects to the production database and applies the CASCADE constraints
that are missing from the actual database but present in the schema.sql file.

The issue: job_listings aren't being deleted when projects are deleted because
the actual database foreign key constraints don't have CASCADE delete.
"""

import psycopg2
import os
from urllib.parse import urlparse

def connect_to_database():
    """Connect to the production database using environment variables"""
    try:
        # Try to get database URL from environment
        database_url = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
        
        if not database_url:
            print("❌ No DATABASE_URL or POSTGRES_URL found in environment variables")
            print("Please set one of these environment variables with your database connection string")
            return None
            
        print(f"🔌 Connecting to database...")
        
        # Parse the database URL
        parsed = urlparse(database_url)
        
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path[1:],  # Remove leading slash
            user=parsed.username,
            password=parsed.password,
            sslmode='require'
        )
        
        print("✅ Connected successfully")
        return conn
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def check_current_constraints(conn):
    """Check what foreign key constraints currently exist"""
    try:
        cursor = conn.cursor()
        
        print("\n🔍 Checking current foreign key constraints...")
        
        # Check job_listings foreign key constraints
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
            WHERE 
                tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'job_listings'
                AND ccu.table_name = 'projects'
            ORDER BY tc.constraint_name;
        """)
        
        constraints = cursor.fetchall()
        
        if constraints:
            print("📋 Current job_listings -> projects foreign key constraints:")
            for constraint in constraints:
                constraint_name, table_name, column_name, foreign_table, foreign_column, delete_rule = constraint
                print(f"  • {constraint_name}: {table_name}.{column_name} -> {foreign_table}.{foreign_column} (DELETE {delete_rule})")
        else:
            print("❌ No foreign key constraints found from job_listings to projects!")
            
        return constraints
        
    except Exception as e:
        print(f"❌ Error checking constraints: {e}")
        return []

def fix_cascade_constraints(conn):
    """Fix the CASCADE constraints for job_listings"""
    try:
        cursor = conn.cursor()
        
        print("\n🔧 Fixing CASCADE constraints...")
        
        # First, check what columns actually exist in job_listings
        print("📝 Checking job_listings table structure...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'job_listings' 
            AND column_name IN ('project_id', 'selected_project_id');
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"  Found columns: {existing_columns}")
        
        # Drop existing constraints
        print("📝 Dropping existing foreign key constraints...")
        
        # Get all existing foreign key constraint names for job_listings -> projects
        cursor.execute("""
            SELECT tc.constraint_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'job_listings'
            AND ccu.table_name = 'projects';
        """)
        
        existing_constraints = cursor.fetchall()
        
        for constraint in existing_constraints:
            constraint_name = constraint[0]
            print(f"  Dropping constraint: {constraint_name}")
            cursor.execute(f"ALTER TABLE job_listings DROP CONSTRAINT IF EXISTS {constraint_name};")
        
        # Add new CASCADE constraints
        print("📝 Adding CASCADE constraints...")
        
        if 'project_id' in existing_columns:
            print("  Adding project_id CASCADE constraint...")
            cursor.execute("""
                ALTER TABLE job_listings 
                ADD CONSTRAINT job_listings_project_id_fkey 
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
            """)
        
        if 'selected_project_id' in existing_columns:
            print("  Adding selected_project_id CASCADE constraint...")
            cursor.execute("""
                ALTER TABLE job_listings 
                ADD CONSTRAINT job_listings_selected_project_id_fkey 
                FOREIGN KEY (selected_project_id) REFERENCES projects(id) ON DELETE CASCADE;
            """)
        
        # Commit the changes
        conn.commit()
        print("✅ CASCADE constraints updated successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error updating constraints: {e}")
        conn.rollback()
        return False

def verify_constraints(conn):
    """Verify the constraints are now correctly set"""
    try:
        cursor = conn.cursor()
        
        print("\n🔍 Verifying updated constraints...")
        
        cursor.execute("""
            SELECT 
                tc.constraint_name,
                kcu.column_name,
                rc.delete_rule
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                JOIN information_schema.referential_constraints AS rc
                  ON tc.constraint_name = rc.constraint_name
            WHERE 
                tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'job_listings'
                AND ccu.table_name = 'projects'
            ORDER BY kcu.column_name;
        """)
        
        constraints = cursor.fetchall()
        
        if constraints:
            print("✅ Updated constraints:")
            cascade_count = 0
            for constraint in constraints:
                constraint_name, column_name, delete_rule = constraint
                status = "✅" if delete_rule == "CASCADE" else "❌"
                print(f"  {status} {column_name}: DELETE {delete_rule}")
                if delete_rule == "CASCADE":
                    cascade_count += 1
            
            if cascade_count > 0:
                print(f"\n🎉 SUCCESS: {cascade_count} CASCADE constraint(s) are now active!")
                print("Jobs will now be automatically deleted when their associated projects are deleted.")
            else:
                print("\n❌ WARNING: No CASCADE constraints found. Manual verification needed.")
        else:
            print("❌ No foreign key constraints found after update!")
            
    except Exception as e:
        print(f"❌ Error verifying constraints: {e}")

def main():
    """Main execution function"""
    print("🚀 Database CASCADE Fix Script")
    print("=" * 50)
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        print("\n❌ Database fix failed!")
        return
    
    try:
        # Check current state
        current_constraints = check_current_constraints(conn)
        
        # Check if we need to fix anything
        needs_fix = True
        if current_constraints:
            cascade_constraints = [c for c in current_constraints if c[5] == 'CASCADE']
            if len(cascade_constraints) >= 1:  # At least project_id should have CASCADE
                print(f"\n✅ Found {len(cascade_constraints)} CASCADE constraint(s) already in place")
                
                # Ask user if they want to proceed anyway
                response = input("\nDo you want to recreate the constraints anyway? (y/N): ").lower().strip()
                needs_fix = response in ['y', 'yes']
        
        if needs_fix:
            # Fix the constraints
            success = fix_cascade_constraints(conn)
            
            if success:
                # Verify the fix
                verify_constraints(conn)
                print("\n✅ Database CASCADE fix completed successfully!")
            else:
                print("\n❌ Database fix failed!")
        else:
            print("\n✅ No changes needed - CASCADE constraints already in place!")
            
    finally:
        # Close connection
        conn.close()
        print("\n🔌 Database connection closed")

if __name__ == "__main__":
    main()
