#!/usr/bin/env python3
"""
BoneBoard Database Manager
Simple tool for clearing test data from the database
"""

import psycopg2
import sys

# Database connection URL
DATABASE_URL = "postgres://u94m20d9lk1e7b:p73a59938021d84383fb460ad5c478003087a16d6038c9e19d6470d2400f1401e@c3v5n5ajfopshl.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d6nclr86s438p6"

def connect_to_database():
    """Connect to the PostgreSQL database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Connected to BoneBoard database successfully")
        return conn
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return None

def clear_test_data(conn):
    """Clear all test data from job listings, projects, freelancer profiles, and messaging"""
    try:
        cursor = conn.cursor()
        
        # Get counts before deletion
        cursor.execute("SELECT COUNT(*) FROM job_listings;")
        job_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM projects;")
        project_count = cursor.fetchone()[0]
        
        # Check if freelancer_profiles table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'freelancer_profiles'
            );
        """)
        freelancer_table_exists = cursor.fetchone()[0]
        
        freelancer_count = 0
        if freelancer_table_exists:
            cursor.execute("SELECT COUNT(*) FROM freelancer_profiles;")
            freelancer_count = cursor.fetchone()[0]
        
        # Check messaging tables
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'conversations'
            );
        """)
        conversations_exist = cursor.fetchone()[0]
        
        conversation_count = 0
        message_count = 0
        if conversations_exist:
            cursor.execute("SELECT COUNT(*) FROM conversations;")
            conversation_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM messages;")
            message_count = cursor.fetchone()[0]
        
        print(f"📊 Current data counts:")
        print(f"   Jobs: {job_count}")
        print(f"   Projects: {project_count}")
        print(f"   Freelancers: {freelancer_count}")
        print(f"   Conversations: {conversation_count}")
        print(f"   Messages: {message_count}")
        
        # Clear messaging data first (due to foreign key constraints)
        if conversations_exist:
            cursor.execute("DELETE FROM message_attachments;")
            cursor.execute("DELETE FROM freelancer_response_times;")
            cursor.execute("DELETE FROM messages;")
            cursor.execute("DELETE FROM conversations;")
        
        # Clear job applications
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'job_applications'
            );
        """)
        if cursor.fetchone()[0]:
            cursor.execute("DELETE FROM job_applications;")
        
        # Clear service packages
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'service_packages'
            );
        """)
        if cursor.fetchone()[0]:
            cursor.execute("DELETE FROM service_packages;")
        
        # Clear the main data
        cursor.execute("DELETE FROM job_listings;")
        cursor.execute("DELETE FROM projects;")
        
        if freelancer_table_exists:
            cursor.execute("DELETE FROM freelancer_profiles;")
        
        # Also clear related tables if they exist
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'project_votes'
            );
        """)
        if cursor.fetchone()[0]:
            cursor.execute("DELETE FROM project_votes;")
        
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'project_fundings'
            );
        """)
        if cursor.fetchone()[0]:
            cursor.execute("DELETE FROM project_fundings;")
        
        conn.commit()
        cursor.close()
        
        print("✅ Successfully cleared all test data:")
        print(f"   Deleted {job_count} job listings")
        print(f"   Deleted {project_count} projects")
        if freelancer_table_exists:
            print(f"   Deleted {freelancer_count} freelancer profiles")
        if conversations_exist:
            print(f"   Deleted {conversation_count} conversations")
            print(f"   Deleted {message_count} messages")
        print("   Cleared related voting, funding, and messaging records")
        
        return True
        
    except Exception as e:
        print(f"❌ Error clearing test data: {e}")
        conn.rollback()
        return False

def show_database_stats(conn):
    """Show current database statistics"""
    try:
        cursor = conn.cursor()
        
        # Get current counts
        cursor.execute("SELECT COUNT(*) FROM job_listings;")
        job_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM projects;")
        project_count = cursor.fetchone()[0]
        
        # Check freelancer profiles
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'freelancer_profiles'
            );
        """)
        freelancer_table_exists = cursor.fetchone()[0]
        
        freelancer_count = 0
        if freelancer_table_exists:
            cursor.execute("SELECT COUNT(*) FROM freelancer_profiles;")
            freelancer_count = cursor.fetchone()[0]
        
        cursor.close()
        
        print("\n📊 BoneBoard Database Statistics:")
        print(f"   Active Jobs: {job_count}")
        print(f"   Active Projects: {project_count}")
        print(f"   Active Freelancers: {freelancer_count}")
        print()
        
    except Exception as e:
        print(f"❌ Error getting database stats: {e}")

def drop_new_tables(conn):
    """Drop new tables for schema updates"""
    try:
        cursor = conn.cursor()
        
        # List of new tables to drop (in reverse dependency order)
        tables_to_drop = [
            'message_attachments',
            'messages', 
            'conversations',
            'response_time_tracking',
            'service_packages'
        ]
        
        print("🗑️ Dropping new tables for schema update...")
        
        for table in tables_to_drop:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
                print(f"   ✅ Dropped table: {table}")
            except Exception as e:
                print(f"   ⚠️ Could not drop {table}: {e}")
        
        conn.commit()
        print("✅ New tables dropped successfully")
        
        print("   Ready for schema update - run your schema.sql to recreate tables")
        
        return True
        
    except Exception as e:
        print(f"❌ Error dropping tables: {e}")
        conn.rollback()
        return False

def update_schema(conn):
    """Update database schema with new tables and fields"""
    try:
        print("🔄 Updating database schema...")
        
        # Read and execute the schema file
        with open('boneboard/database/schema.sql', 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # Split into individual statements and execute
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        success_count = 0
        skip_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements):
            # Use individual transactions for each statement
            cursor = conn.cursor()
            try:
                if statement.upper().startswith('CREATE TABLE'):
                    # Extract table name for better logging
                    table_name = statement.split('(')[0].split()[-1]
                    cursor.execute(statement + ';')
                    conn.commit()
                    print(f"   ✅ Created/updated table: {table_name}")
                    success_count += 1
                elif statement.upper().startswith('CREATE'):
                    cursor.execute(statement + ';')
                    conn.commit()
                    print(f"   ✅ Executed CREATE statement {i+1}")
                    success_count += 1
                else:
                    cursor.execute(statement + ';')
                    conn.commit()
                    success_count += 1
                    
            except Exception as e:
                conn.rollback()  # Rollback failed transaction
                if "already exists" in str(e).lower():
                    print(f"   ℹ️ Statement {i+1} - Object already exists (skipping)")
                    skip_count += 1
                else:
                    print(f"   ⚠️ Error in statement {i+1}: {e}")
                    error_count += 1
            finally:
                cursor.close()
        
        print(f"✅ Schema update completed: {success_count} successful, {skip_count} skipped, {error_count} errors")
        
    except Exception as e:
        print(f"❌ Error updating schema: {e}")

def main():
    """Main function to handle command line operations"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python database_manager.py clear          - Clear all test data")
        print("  python database_manager.py stats          - Show database statistics")
        print("  python database_manager.py drop           - Drop new tables for schema update")
        print("  python database_manager.py update         - Update database schema")
        return
    
    command = sys.argv[1].lower()
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        if command == "clear":
            clear_test_data(conn)
            
        elif command == "stats":
            show_database_stats(conn)
            
        elif command == "drop":
            drop_new_tables(conn)
            
        elif command == "update":
            update_schema(conn)
            
        else:
            print(f"❌ Unknown command: {command}")
            print("Available commands: clear, stats, drop, update")
            
    finally:
        conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    main()
