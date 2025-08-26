#!/usr/bin/env python3
"""
BoneBoard Database Manager
Comprehensive tool for clearing ALL test data from the database
Clears: Jobs, Projects, Freelancer Profiles, Messages, and all related data
"""

import psycopg2
import sys

# Database connection URL
DATABASE_URL = "postgres://u94m20d9lk1e7b:p73a59938021d84383fb460ad5c478003087a16d6038c9e19d6470d2400f1401e@c3v5n5ajfopshl.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d6nclr86s438p6"

def connect_to_database():
    """Connect to the PostgreSQL database"""
    try:
        print("🔌 Attempting to connect to database...")
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Connected to BoneBoard database successfully")
        return conn
    except ImportError as e:
        print(f"❌ psycopg2 not installed: {e}")
        print("💡 Try: pip install psycopg2-binary")
        return None
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        return None

def clear_test_data(conn):
    """Clear all test data from job listings, projects, freelancer profiles, and messaging"""
    try:
        cursor = conn.cursor()
        
        print("📊 Getting current data counts...")
        
        # Get counts before deletion - handle missing tables gracefully
        try:
            cursor.execute("SELECT COUNT(*) FROM job_listings;")
            job_count = cursor.fetchone()[0]
        except Exception:
            job_count = 0
            print("   ⚠️ job_listings table not found")
        
        try:
            cursor.execute("SELECT COUNT(*) FROM projects;")
            project_count = cursor.fetchone()[0]
        except Exception:
            project_count = 0
            print("   ⚠️ projects table not found")
        
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
        
        # Clear all related data in proper order (respecting foreign key constraints)
        print("🧹 Starting comprehensive data cleanup...")
        
        cleared_count = 0
        
        # 1. Clear messaging data first (due to foreign key constraints)
        tables_to_clear = [
            'message_attachments',
            'freelancer_response_times', 
            'messages',
            'conversations'
        ]
        
        for table in tables_to_clear:
            try:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    );
                """)
                if cursor.fetchone()[0]:
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    if count > 0:
                        cursor.execute(f"DELETE FROM {table};")
                        print(f"   ✅ Cleared {count} records from {table}")
                        cleared_count += count
                    else:
                        print(f"   ℹ️ {table} already empty")
                else:
                    print(f"   ⚠️ {table} does not exist")
            except Exception as e:
                print(f"   ❌ Error clearing {table}: {e}")
        
        # 2. Clear job-related data
        job_related_tables = [
            'saved_jobs',  # User bookmarks (updated table name)
            'job_views',
            'job_listings'
        ]
        
        for table in job_related_tables:
            try:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    );
                """)
                if cursor.fetchone()[0]:
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    if count > 0:
                        cursor.execute(f"DELETE FROM {table};")
                        print(f"   ✅ Cleared {count} records from {table}")
                        cleared_count += count
                    else:
                        print(f"   ℹ️ {table} already empty")
                else:
                    print(f"   ⚠️ {table} does not exist")
            except Exception as e:
                print(f"   ❌ Error clearing {table}: {e}")
        
        # 3. Clear project-related data
        project_related_tables = [
            'project_votes',
            'project_fundings',
            'project_comments',
            'project_updates',
            'projects'
        ]
        
        for table in project_related_tables:
            try:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    );
                """)
                if cursor.fetchone()[0]:
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    if count > 0:
                        cursor.execute(f"DELETE FROM {table};")
                        print(f"   ✅ Cleared {count} records from {table}")
                        cleared_count += count
                    else:
                        print(f"   ℹ️ {table} already empty")
                else:
                    print(f"   ⚠️ {table} does not exist")
            except Exception as e:
                print(f"   ❌ Error clearing {table}: {e}")
        
        # 4. Clear freelancer-related data (including work examples, portfolios, reviews)
        freelancer_related_tables = [
            'job_applications',  # Applications by freelancers
            'reviews',  # Reviews for freelancers (has freelancer_id, reviewer_id, job_id)
            'service_packages',  # Freelancer service offerings
            'freelancer_response_times',  # Response time tracking (has freelancer_wallet, conversation_id)
            'freelancer_portfolios',  # Work examples and portfolios
            'freelancer_skills',  # Skills listings
            'freelancer_profiles'  # Main freelancer profiles (has user_id, work_images, etc.)
        ]
        
        for table in freelancer_related_tables:
            try:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    );
                """)
                if cursor.fetchone()[0]:
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    if count > 0:
                        cursor.execute(f"DELETE FROM {table};")
                        print(f"   ✅ Cleared {count} records from {table}")
                        cleared_count += count
                    else:
                        print(f"   ℹ️ {table} already empty")
                else:
                    print(f"   ⚠️ {table} does not exist")
            except Exception as e:
                print(f"   ❌ Error clearing {table}: {e}")
        
        # 5. Clear user-generated content and transaction data
        other_tables = [
            'notifications',  # User notifications
            'scam_report_votes',  # Scam report voting
            'scam_reports',  # Scam reports
            'funding_contributions',  # Project funding contributions
            'project_funding',  # Project funding records
            'bone_transactions',  # BONE token transactions
            'ada_transactions',  # ADA transactions
            'wallet_connections',  # Wallet connection records
            'users'  # User accounts (clears all user data)
        ]
        
        for table in other_tables:
            try:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    );
                """)
                if cursor.fetchone()[0]:
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    if count > 0:
                        cursor.execute(f"DELETE FROM {table};")
                        print(f"   ✅ Cleared {count} records from {table}")
                        cleared_count += count
                    else:
                        print(f"   ℹ️ {table} already empty")
                else:
                    print(f"   ⚠️ {table} does not exist")
            except Exception as e:
                print(f"   ❌ Error clearing {table}: {e}")
        
        conn.commit()
        cursor.close()
        
        print(f"\n✅ Successfully cleared all test data:")
        print(f"   🗑️ Total records cleared: {cleared_count}")
        print(f"   🗑️ Jobs before cleanup: {job_count}")
        print(f"   🗑️ Projects before cleanup: {project_count}")
        if freelancer_table_exists:
            print(f"   🗑️ Freelancers before cleanup: {freelancer_count}")
        if conversations_exist:
            print(f"   🗑️ Conversations before cleanup: {conversation_count}")
            print(f"   🗑️ Messages before cleanup: {message_count}")
        
        if cleared_count > 0:
            print("\n🎉 Database cleanup completed! Ready for fresh test data!")
        else:
            print("\nℹ️ Database was already clean - no records to clear.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error clearing test data: {e}")
        print(f"🔍 Error details: {type(e).__name__}")
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



def main():
    """Main function to handle command line operations"""
    print("🚀 BoneBoard Database Manager Starting...")
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python database_manager.py clear          - Clear all test data")
        print("  python database_manager.py stats          - Show database statistics")
        print("\n💡 Example: python database_manager.py stats")
        return
    
    command = sys.argv[1].lower()
    print(f"📋 Command: {command}")
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        print("❌ Failed to connect to database. Exiting.")
        return
    
    try:
        if command == "clear":
            clear_test_data(conn)
            
        elif command == "stats":
            show_database_stats(conn)
            
        else:
            print(f"❌ Unknown command: {command}")
            print("Available commands: clear, stats")
            
    finally:
        conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    main()
