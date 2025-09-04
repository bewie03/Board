#!/usr/bin/env python3
"""
Check funding contributions data in the database
"""

import psycopg2
import sys
from datetime import datetime

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

def check_funding_contributions(conn):
    """Check funding contributions data"""
    cursor = None
    try:
        cursor = conn.cursor()
        
        # Get contribution count
        cursor.execute("SELECT COUNT(*) FROM funding_contributions")
        contrib_count = cursor.fetchone()[0]
        
        print(f"\n💰 FUNDING CONTRIBUTIONS ({contrib_count} total)")
        print("=" * 80)
        
        if contrib_count == 0:
            print("❌ No contributions found in database - this is why contributors show 0.00 ADA")
            return
        
        # Get all contributions with details
        cursor.execute("""
            SELECT id, project_funding_id, contributor_wallet, ada_amount, 
                   ada_tx_hash, message, is_anonymous, created_at
            FROM funding_contributions 
            ORDER BY created_at DESC
        """)
        
        contributions = cursor.fetchall()
        
        print(f"\n📋 ALL CONTRIBUTIONS:")
        for i, contrib in enumerate(contributions, 1):
            contrib_id, project_id, wallet, ada_amount, tx_hash, message, is_anon, created_at = contrib
            print(f"\n{i}. ID: {contrib_id}")
            print(f"   Project: {project_id}")
            print(f"   Wallet: {wallet}")
            print(f"   ADA Amount: {ada_amount}")
            print(f"   TX Hash: {tx_hash}")
            print(f"   Message: {message}")
            print(f"   Anonymous: {'Yes' if is_anon else 'No'}")
            print(f"   Created: {created_at}")
        
        # Check aggregated data per project (same as API query)
        print(f"\n🔍 AGGREGATED DATA (Same as API Query):")
        print("=" * 80)
        
        cursor.execute("""
            SELECT 
                fc.contributor_wallet,
                fc.project_funding_id,
                fc.is_anonymous,
                SUM(fc.ada_amount)::DECIMAL(15,6) as total_ada_amount,
                COUNT(*)::INTEGER as contribution_count,
                MAX(fc.created_at) as latest_contribution_date
            FROM funding_contributions fc
            WHERE fc.project_funding_id = (SELECT id FROM project_funding WHERE is_active = true LIMIT 1)
            GROUP BY fc.contributor_wallet, fc.project_funding_id, fc.is_anonymous
            ORDER BY MAX(fc.created_at) DESC
        """)
        
        aggregated = cursor.fetchall()
        
        if not aggregated:
            print("❌ No aggregated data found - check if project_funding_id matches")
        
        for wallet, project_id, is_anon, total_ada, count, latest_date in aggregated:
            print(f"\nContributor: {wallet}")
            print(f"  Project ID: {project_id}")
            print(f"  Total ADA: {total_ada}")
            print(f"  Contribution Count: {count}")
            print(f"  Latest Date: {latest_date}")
            print(f"  Anonymous: {'Yes' if is_anon else 'No'}")
        
        # Check project funding totals
        print(f"\n📊 PROJECT FUNDING TOTALS:")
        print("=" * 80)
        
        cursor.execute("""
            SELECT 
                pf.id,
                pf.current_funding,
                pf.funding_goal,
                (SELECT SUM(fc.ada_amount) FROM funding_contributions fc WHERE fc.project_funding_id = pf.id) as calculated_total,
                (SELECT COUNT(DISTINCT fc.contributor_wallet) FROM funding_contributions fc WHERE fc.project_funding_id = pf.id) as unique_contributors
            FROM project_funding pf
            WHERE pf.is_active = true
        """)
        
        projects = cursor.fetchall()
        
        for project_id, current_funding, goal, calculated_total, contributors in projects:
            print(f"\nProject ID: {project_id}")
            print(f"  Current Funding (stored): {current_funding}")
            print(f"  Funding Goal: {goal}")
            print(f"  Calculated Total (from contributions): {calculated_total}")
            print(f"  Unique Contributors: {contributors}")
            
            if current_funding != calculated_total:
                print(f"  ⚠️  MISMATCH: Stored funding ({current_funding}) != Calculated ({calculated_total})")
        
    except Exception as e:
        print(f"❌ Error checking contributions: {e}")
        conn.rollback()
    finally:
        if cursor:
            cursor.close()

def main():
    """Main function"""
    print("🔍 Funding Contributions Inspector")
    print("=" * 50)
    
    conn = connect_to_database()
    if not conn:
        sys.exit(1)
    
    try:
        check_funding_contributions(conn)
        print(f"\n✅ Inspection complete!")
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    main()
