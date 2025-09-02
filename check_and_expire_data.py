#!/usr/bin/env python3
"""
BoneBoard Database Inspector and Expiry Tester
Checks current jobs and funding projects, then sets some to expired for testing
"""

import psycopg2
import sys
from datetime import datetime, timedelta, timezone

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

def check_jobs(conn):
    """Check current jobs in the database"""
    print("\n📋 CHECKING JOBS:")
    print("=" * 50)
    
    cursor = conn.cursor()
    
    # Get job counts by status
    cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM job_listings 
        GROUP BY status
        ORDER BY count DESC
    """)
    
    status_counts = cursor.fetchall()
    print("Job Status Summary:")
    for status, count in status_counts:
        print(f"  {status}: {count} jobs")
    
    # Get detailed job info
    cursor.execute("""
        SELECT id, title, company, status, expires_at, created_at
        FROM job_listings 
        ORDER BY created_at DESC
        LIMIT 10
    """)
    
    jobs = cursor.fetchall()
    print(f"\nRecent Jobs (showing {len(jobs)} of total):")
    print("-" * 80)
    
    for job in jobs:
        job_id, title, company, status, expires_at, created_at = job
        expires_str = expires_at.strftime("%Y-%m-%d %H:%M") if expires_at else "No expiry"
        created_str = created_at.strftime("%Y-%m-%d %H:%M") if created_at else "Unknown"
        
        # Check if expired (handle timezone-aware comparison)
        now_utc = datetime.now(timezone.utc)
        is_expired = expires_at and expires_at < now_utc
        expired_marker = " [EXPIRED]" if is_expired else ""
        
        print(f"ID: {job_id}")
        print(f"  Title: {title}")
        print(f"  Company: {company}")
        print(f"  Status: {status}{expired_marker}")
        print(f"  Created: {created_str}")
        print(f"  Expires: {expires_str}")
        print()
    
    cursor.close()
    return jobs

def check_funding_projects(conn):
    """Check current funding projects in the database"""
    print("\n💰 CHECKING FUNDING PROJECTS:")
    print("=" * 50)
    
    cursor = conn.cursor()
    
    # Get project counts by status
    cursor.execute("""
        SELECT 
            CASE 
                WHEN is_funded = true THEN 'completed'
                WHEN funding_deadline < NOW() THEN 'expired'
                ELSE 'active'
            END as status,
            COUNT(*) as count
        FROM project_funding 
        GROUP BY status
        ORDER BY count DESC
    """)
    
    status_counts = cursor.fetchall()
    print("Funding Project Status Summary:")
    for status, count in status_counts:
        print(f"  {status}: {count} projects")
    
    # Get detailed project info
    cursor.execute("""
        SELECT id, funding_purpose, funding_goal, current_funding, funding_deadline, created_at
        FROM project_funding 
        ORDER BY created_at DESC
        LIMIT 10
    """)
    
    projects = cursor.fetchall()
    print(f"\nRecent Funding Projects (showing {len(projects)} of total):")
    print("-" * 80)
    
    for project in projects:
        proj_id, title, goal, current, deadline, created_at = project
        deadline_str = deadline.strftime("%Y-%m-%d %H:%M") if deadline else "No deadline"
        created_str = created_at.strftime("%Y-%m-%d %H:%M") if created_at else "Unknown"
        
        # Check status (handle timezone-aware comparison)
        now_utc = datetime.now(timezone.utc)
        is_expired = deadline and deadline < now_utc
        is_completed = current >= goal
        status = "COMPLETED" if is_completed else ("EXPIRED" if is_expired else "ACTIVE")
        progress = (current / goal * 100) if goal > 0 else 0
        
        print(f"ID: {proj_id}")
        print(f"  Title: {title}")
        print(f"  Status: {status}")
        print(f"  Progress: {current:.2f}/{goal:.2f} ADA ({progress:.1f}%)")
        print(f"  Created: {created_str}")
        print(f"  Deadline: {deadline_str}")
        print()
    
    cursor.close()
    return projects

def expire_test_jobs(conn):
    """Set some jobs to expired status for testing"""
    print("\n⏰ SETTING TEST JOBS TO EXPIRED:")
    print("=" * 50)
    
    cursor = conn.cursor()
    
    # Find active jobs to expire
    cursor.execute("""
        SELECT id, title, company, expires_at
        FROM job_listings 
        WHERE status = 'confirmed' 
        AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 3
    """)
    
    jobs_to_expire = cursor.fetchall()
    
    if not jobs_to_expire:
        print("❌ No active jobs found to expire")
        cursor.close()
        return
    
    print(f"Found {len(jobs_to_expire)} active jobs to expire:")
    
    # Set expiry date to yesterday (timezone-aware)
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    
    for job in jobs_to_expire:
        job_id, title, company, current_expires = job
        
        cursor.execute("""
            UPDATE job_listings 
            SET expires_at = %s, updated_at = NOW()
            WHERE id = %s
        """, (yesterday, job_id))
        
        print(f"✅ Expired job: {title} (Company: {company})")
        print(f"   ID: {job_id}")
        print(f"   New expiry: {yesterday.strftime('%Y-%m-%d %H:%M')}")
        print()
    
    conn.commit()
    cursor.close()
    print(f"✅ Successfully expired {len(jobs_to_expire)} jobs for testing")

def expire_test_funding(conn):
    """Set some funding projects to expired status for testing"""
    print("\n💸 SETTING TEST FUNDING PROJECTS TO EXPIRED:")
    print("=" * 50)
    
    cursor = conn.cursor()
    
    # Find active funding projects to expire
    cursor.execute("""
        SELECT id, funding_purpose, funding_goal, current_funding, funding_deadline
        FROM project_funding 
        WHERE is_funded = false 
        AND funding_deadline > NOW()
        ORDER BY created_at DESC
        LIMIT 2
    """)
    
    projects_to_expire = cursor.fetchall()
    
    if not projects_to_expire:
        print("❌ No active funding projects found to expire")
        cursor.close()
        return
    
    print(f"Found {len(projects_to_expire)} active funding projects to expire:")
    
    # Set deadline to yesterday (timezone-aware)
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    
    for project in projects_to_expire:
        proj_id, title, goal, current, current_deadline = project
        
        cursor.execute("""
            UPDATE project_funding 
            SET funding_deadline = %s, updated_at = NOW()
            WHERE id = %s
        """, (yesterday, proj_id))
        
        progress = (current / goal * 100) if goal > 0 else 0
        print(f"✅ Expired funding: {title}")
        print(f"   ID: {proj_id}")
        print(f"   Progress: {current:.2f}/{goal:.2f} ADA ({progress:.1f}%)")
        print(f"   New deadline: {yesterday.strftime('%Y-%m-%d %H:%M')}")
        print()
    
    conn.commit()
    cursor.close()
    print(f"✅ Successfully expired {len(projects_to_expire)} funding projects for testing")

def main():
    """Main function"""
    print("🚀 BoneBoard Database Inspector and Expiry Tester")
    print("=" * 60)
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        sys.exit(1)
    
    try:
        # Check current state
        jobs = check_jobs(conn)
        projects = check_funding_projects(conn)
        
        # Ask user if they want to proceed with expiring test data
        print("\n" + "=" * 60)
        print("🧪 TESTING PHASE")
        print("=" * 60)
        
        response = input("\nDo you want to expire some jobs and funding projects for testing? (y/N): ")
        
        if response.lower() in ['y', 'yes']:
            expire_test_jobs(conn)
            expire_test_funding(conn)
            
            print("\n" + "=" * 60)
            print("✅ TESTING DATA CREATED")
            print("=" * 60)
            print("You can now test the frontend:")
            print("1. Check My Jobs page for expired jobs section")
            print("2. Check Funding page with 'Expired' filter")
            print("3. Test job reactivation functionality")
            print("4. Verify funding project status badges")
        else:
            print("❌ Skipped expiring test data")
        
    except Exception as e:
        print(f"❌ Error during operation: {e}")
        conn.rollback()
    
    finally:
        conn.close()
        print("\n🔌 Database connection closed")

if __name__ == "__main__":
    main()
