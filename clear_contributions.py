#!/usr/bin/env python3
"""
Clear all funding contributions from the database
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
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None

def clear_contributions(conn):
    """Clear all funding contributions"""
    cursor = None
    try:
        cursor = conn.cursor()
        
        # First, check how many contributions exist
        cursor.execute("SELECT COUNT(*) FROM funding_contributions")
        count_before = cursor.fetchone()[0]
        print(f"📊 Found {count_before} contributions in database")
        
        if count_before == 0:
            print("✅ No contributions to clear")
            return
        
        # Clear all contributions
        print("🗑️  Clearing all funding contributions...")
        cursor.execute("DELETE FROM funding_contributions")
        
        # Reset project funding amounts to 0
        print("💰 Resetting project funding amounts to 0...")
        cursor.execute("UPDATE project_funding SET current_funding = 0")
        
        # Commit the changes
        conn.commit()
        
        # Verify deletion
        cursor.execute("SELECT COUNT(*) FROM funding_contributions")
        count_after = cursor.fetchone()[0]
        
        print(f"✅ Cleared {count_before} contributions")
        print(f"📊 Remaining contributions: {count_after}")
        print("✅ Reset all project funding amounts to 0")
        
    except Exception as e:
        print(f"❌ Error clearing contributions: {e}")
        conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()

def main():
    """Main function"""
    print("🗑️  Funding Contributions Cleaner")
    print("=" * 50)
    
    # Confirm with user
    response = input("⚠️  This will DELETE ALL funding contributions. Are you sure? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Operation cancelled")
        sys.exit(0)
    
    conn = connect_to_database()
    if not conn:
        sys.exit(1)
    
    try:
        clear_contributions(conn)
        print(f"\n✅ All contributions cleared successfully!")
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
    finally:
        conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    main()
