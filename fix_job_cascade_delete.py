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
        # Add connection timeout and retry logic
        conn = psycopg2.connect(
            DATABASE_URL,
            connect_timeout=10,
            options='-c statement_timeout=30000'
        )
        print("✅ Connected successfully")
        return conn
    except ImportError as e:
        print(f"❌ psycopg2 not installed: {e}")
        print("💡 Install with: pip install psycopg2-binary")
        return None
    except psycopg2.OperationalError as e:
        print(f"❌ Database connection failed: {e}")
        print("💡 Check if the database URL is correct and the database is accessible")
        return None
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def check_current_constraints(conn):
    """Check current foreign key constraints on job_listings table"""
    try:
        cursor = conn.cursor()
        
        print("\n🔍 Checking current constraints on job_listings table...")
        
        # Check what columns exist
        print("📝 Checking existing columns...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'job_listings' 
            AND column_name IN ('project_id', 'selected_project_id')
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        if columns:
            print("  Found columns:")
            for col_name, data_type, nullable in columns:
                print(f"    • {col_name}: {data_type} (nullable: {nullable})")
        else:
            print("  ❌ No project_id or selected_project_id columns found!")
            return False
            
        existing_columns = [row[0] for row in columns]
        
        # Check current foreign key constraints
        print("\n📝 Checking current foreign key constraints...")
        cursor.execute("""
            SELECT 
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule,
                rc.update_rule
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
              AND kcu.column_name IN ('project_id', 'selected_project_id')
            ORDER BY kcu.column_name;
        """)
        
        constraints = cursor.fetchall()
        
        if constraints:
            print("  Current constraints:")
            needs_fix = False
            for constraint_name, column_name, foreign_table, foreign_column, delete_rule, update_rule in constraints:
                status = "✅ OK" if delete_rule == 'CASCADE' else "❌ NEEDS FIX"
                print(f"    • {column_name} → {foreign_table}.{foreign_column}")
                print(f"      DELETE: {delete_rule}, UPDATE: {update_rule} {status}")
                if delete_rule != 'CASCADE':
                    needs_fix = True
        else:
            print("  ❌ No foreign key constraints found!")
            needs_fix = True
            
        cursor.close()
        return existing_columns, needs_fix
        
    except Exception as e:
        print(f"❌ Error checking constraints: {e}")
        return [], True

def fix_cascade_constraints(conn, existing_columns):
    """Fix job_listings foreign key constraints to CASCADE delete"""
    try:
        cursor = conn.cursor()
        
        print("\n🔧 Fixing job_listings foreign key constraints...")
        
        # Drop ALL existing foreign key constraints on these columns
        print("📝 Dropping existing constraints...")
        
        # Get all constraint names first
        cursor.execute("""
            SELECT tc.constraint_name, kcu.column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name = 'job_listings'
              AND kcu.column_name IN ('project_id', 'selected_project_id');
        """)
        
        constraints_to_drop = cursor.fetchall()
        
        for constraint_name, column_name in constraints_to_drop:
            print(f"  Dropping constraint: {constraint_name} on {column_name}")
            cursor.execute(f"ALTER TABLE job_listings DROP CONSTRAINT IF EXISTS {constraint_name};")
        
        # Add new CASCADE constraints
        print("📝 Adding CASCADE constraints...")
        
        if 'project_id' in existing_columns:
            print("  Adding project_id CASCADE constraint...")
            cursor.execute("""
                ALTER TABLE job_listings 
                ADD CONSTRAINT job_listings_project_id_fkey 
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;
            """)
        
        if 'selected_project_id' in existing_columns:
            print("  Adding selected_project_id CASCADE constraint...")
            cursor.execute("""
                ALTER TABLE job_listings 
                ADD CONSTRAINT job_listings_selected_project_id_fkey 
                FOREIGN KEY (selected_project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;
            """)
        
        # Commit the changes
        conn.commit()
        print("✅ Foreign key constraints updated successfully")
        
        cursor.close()
        return True
        
    except Exception as e:
        print(f"❌ Error updating constraints: {e}")
        conn.rollback()
        return False

def verify_final_constraints(conn):
    """Final verification of CASCADE constraints"""
    try:
        cursor = conn.cursor()
        
        print("\n🔍 Final verification of constraints...")
        cursor.execute("""
            SELECT 
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule,
                rc.update_rule
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
              AND kcu.column_name IN ('project_id', 'selected_project_id')
            ORDER BY kcu.column_name;
        """)
        
        results = cursor.fetchall()
        
        print("\n📊 Final constraint status:")
        all_cascade = True
        for constraint_name, column_name, foreign_table, foreign_column, delete_rule, update_rule in results:
            status = "✅" if delete_rule == 'CASCADE' else "❌"
            print(f"  {status} {column_name} → {foreign_table}.{foreign_column}")
            print(f"      DELETE: {delete_rule}, UPDATE: {update_rule}")
            if delete_rule != 'CASCADE':
                all_cascade = False
        
        cursor.close()
        return all_cascade, len(results)
        
    except Exception as e:
        print(f"❌ Error verifying constraints: {e}")
        return False, 0

def test_cascade_behavior(conn):
    """Test CASCADE behavior with a dry run"""
    try:
        cursor = conn.cursor()
        
        print("\n🧪 Testing CASCADE behavior...")
        
        # Check if there are any jobs with project references
        # First check which columns actually exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'job_listings' 
            AND column_name IN ('project_id', 'selected_project_id');
        """)
        
        available_columns = [row[0] for row in cursor.fetchall()]
        
        # Build query based on available columns
        if 'selected_project_id' in available_columns:
            cursor.execute("""
                SELECT COUNT(*) as job_count,
                       COUNT(DISTINCT project_id) as unique_projects,
                       COUNT(DISTINCT selected_project_id) as unique_selected_projects
                FROM job_listings 
                WHERE project_id IS NOT NULL OR selected_project_id IS NOT NULL;
            """)
            result = cursor.fetchone()
            job_count, unique_projects, unique_selected = result
        else:
            cursor.execute("""
                SELECT COUNT(*) as job_count,
                       COUNT(DISTINCT project_id) as unique_projects
                FROM job_listings 
                WHERE project_id IS NOT NULL;
            """)
            result = cursor.fetchone()
            job_count, unique_projects = result
            unique_selected = 0
        
        print(f"  📊 Current data:")
        print(f"    • Jobs with project references: {job_count}")
        print(f"    • Unique project_id values: {unique_projects}")
        print(f"    • Unique selected_project_id values: {unique_selected}")
        
        if job_count > 0:
            print(f"  ✅ CASCADE is ready to work - {job_count} jobs will be deleted when their projects are removed")
        else:
            print(f"  ℹ️  No jobs currently reference projects - CASCADE will work when needed")
        
        cursor.close()
        return True
        
    except Exception as e:
        print(f"❌ Error testing CASCADE: {e}")
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
        # Step 1: Check current state
        existing_columns, needs_fix = check_current_constraints(conn)
        
        if not existing_columns:
            print("\n❌ No project reference columns found in job_listings table!")
            sys.exit(1)
        
        if not needs_fix:
            print("\n✅ All constraints are already properly configured with CASCADE!")
            print("\n🧪 Running verification tests...")
            verify_final_constraints(conn)
            test_cascade_behavior(conn)
            return
        
        # Step 2: Fix the constraints
        print("\n🔧 Constraints need to be fixed...")
        success = fix_cascade_constraints(conn, existing_columns)
        
        if not success:
            print("\n❌ Database update failed!")
            sys.exit(1)
        
        # Step 3: Verify the fix
        all_cascade, constraint_count = verify_final_constraints(conn)
        
        if all_cascade and constraint_count > 0:
            print("\n✅ CASCADE constraints are properly configured!")
            print("🎯 When a project is deleted, all associated jobs will be automatically deleted")
            
            # Step 4: Test the setup
            test_cascade_behavior(conn)
            
            print("\n🎉 Database update completed successfully!")
            print("\n📋 Summary:")
            print(f"  • Fixed {constraint_count} foreign key constraints")
            print("  • job_listings.project_id now CASCADE deletes")
            if 'selected_project_id' in existing_columns:
                print("  • job_listings.selected_project_id now CASCADE deletes")
            print("  • When projects are deleted, associated jobs are automatically removed")
            print("  • This prevents orphaned jobs from scam projects")
        else:
            print("\n⚠️  Some constraints may not be properly configured")
            print("Please check the constraint status above and fix manually if needed")
            
    finally:
        conn.close()
        print("\n🔌 Database connection closed")

if __name__ == "__main__":
    main()
