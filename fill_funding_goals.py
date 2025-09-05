#!/usr/bin/env python3
"""
BoneBoard Funding Goal Filler
Connects to the database and fills up the funding goals of current funding projects
"""

import psycopg2
import sys
from decimal import Decimal

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
        sys.exit(1)
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

def get_active_funding_projects(cursor):
    """Get all active funding projects with their current funding and goals"""
    query = """
    SELECT 
        pf.id,
        pf.project_id,
        p.title,
        pf.funding_goal,
        pf.current_funding,
        pf.is_active,
        pf.is_funded
    FROM project_funding pf
    JOIN projects p ON pf.project_id = p.id
    WHERE pf.is_active = true AND pf.is_funded = false
    ORDER BY p.title;
    """
    
    cursor.execute(query)
    return cursor.fetchall()

def fill_funding_goal(cursor, funding_id, current_funding, funding_goal):
    """Fill the funding goal by updating current_funding to match funding_goal"""
    try:
        # Update current_funding to match funding_goal
        update_query = """
        UPDATE project_funding 
        SET current_funding = %s, is_funded = true
        WHERE id = %s;
        """
        
        cursor.execute(update_query, (funding_goal, funding_id))
        print(f"✅ Updated funding record {funding_id}: {current_funding} ADA → {funding_goal} ADA (GOAL REACHED!)")
        return True
        
    except Exception as e:
        print(f"❌ Failed to update funding record {funding_id}: {e}")
        return False

def main():
    """Main function to fill funding goals"""
    print("🚀 BoneBoard Funding Goal Filler")
    print("=" * 50)
    
    # Connect to database
    conn = connect_to_database()
    cursor = conn.cursor()
    
    try:
        # Get active funding projects
        print("\n📊 Fetching active funding projects...")
        projects = get_active_funding_projects(cursor)
        
        if not projects:
            print("ℹ️  No active funding projects found")
            return
        
        print(f"\n🎯 Found {len(projects)} active funding projects:")
        print("-" * 80)
        
        for project in projects:
            funding_id, project_id, title, funding_goal, current_funding, is_active, is_funded = project
            
            print(f"📋 Project: {title}")
            print(f"   ID: {funding_id}")
            print(f"   Current: {current_funding} ADA")
            print(f"   Goal: {funding_goal} ADA")
            print(f"   Progress: {(float(current_funding) / float(funding_goal) * 100):.1f}%")
            print()
        
        # Ask for confirmation
        print("⚠️  This will fill ALL funding goals to 100% completion!")
        confirm = input("Do you want to proceed? (yes/no): ").lower().strip()
        
        if confirm not in ['yes', 'y']:
            print("❌ Operation cancelled")
            return
        
        print("\n🔄 Filling funding goals...")
        print("-" * 50)
        
        success_count = 0
        for project in projects:
            funding_id, project_id, title, funding_goal, current_funding, is_active, is_funded = project
            
            print(f"💰 Filling funding for: {title}")
            if fill_funding_goal(cursor, funding_id, current_funding, funding_goal):
                success_count += 1
        
        # Commit changes
        conn.commit()
        print(f"\n🎉 Successfully filled {success_count}/{len(projects)} funding goals!")
        print("💾 Changes committed to database")
        
        # Show updated results
        print("\n📈 Updated funding status:")
        print("-" * 50)
        updated_projects = get_active_funding_projects(cursor)
        
        if not updated_projects:
            print("✅ All projects are now fully funded!")
        else:
            for project in updated_projects:
                funding_id, project_id, title, funding_goal, current_funding, is_active, is_funded = project
                print(f"📋 {title}: {current_funding}/{funding_goal} ADA ({(float(current_funding) / float(funding_goal) * 100):.1f}%)")
        
    except Exception as e:
        print(f"❌ Error during operation: {e}")
        conn.rollback()
        
    finally:
        cursor.close()
        conn.close()
        print("\n🔌 Database connection closed")

if __name__ == "__main__":
    main()
