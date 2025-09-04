#!/usr/bin/env python3
"""
BoneBoard Database Inspector
Checks job listings and project listings to view current data and associations
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
    except ImportError as e:
        print(f"❌ psycopg2 not installed: {e}")
        print("💡 Install with: pip install psycopg2-binary")
        return None
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None

def check_projects(conn):
    """Check all projects in the database"""
    cursor = None
    try:
        cursor = conn.cursor()
        
        # Get project count
        cursor.execute("SELECT COUNT(*) FROM projects")
        project_count = cursor.fetchone()[0]
        
        print(f"\n📋 PROJECTS ({project_count} total)")
        print("=" * 80)
        
        if project_count == 0:
            print("No projects found in database")
            return
        
        # Get all projects with key fields (no 'name' column)
        cursor.execute("""
            SELECT id, title, category, wallet_address, created_at, is_verified
            FROM projects 
            ORDER BY created_at DESC
        """)
        
        projects = cursor.fetchall()
        
        for i, project in enumerate(projects, 1):
            project_id, title, category, wallet, created_at, verified = project
            print(f"\n{i}. PROJECT ID: {project_id}")
            print(f"   Title: {title}")
            print(f"   Category: {category}")
            print(f"   Wallet: {wallet}")
            print(f"   Created: {created_at}")
            print(f"   Verified: {'✅' if verified else '❌'}")
        
    except Exception as e:
        print(f"❌ Error checking projects: {e}")
        conn.rollback()  # Rollback on error
    finally:
        if cursor:
            cursor.close()

def check_jobs(conn):
    """Check all jobs in the database"""
    cursor = None
    try:
        cursor = conn.cursor()
        
        # Get job count
        cursor.execute("SELECT COUNT(*) FROM job_listings")
        job_count = cursor.fetchone()[0]
        
        print(f"\n💼 JOB LISTINGS ({job_count} total)")
        print("=" * 80)
        
        if job_count == 0:
            print("No jobs found in database")
            return
        
        # Get all jobs with project associations (no 'name' column in projects)
        cursor.execute("""
            SELECT j.id, j.title, j.company, j.project_id, j.user_id, j.created_at, j.status,
                   p.title as project_title
            FROM job_listings j
            LEFT JOIN projects p ON j.project_id = p.id
            ORDER BY j.created_at DESC
        """)
        
        jobs = cursor.fetchall()
        
        for i, job in enumerate(jobs, 1):
            job_id, title, company, project_id, user_id, created_at, status, project_title = job
            print(f"\n{i}. JOB ID: {job_id}")
            print(f"   Title: {title}")
            print(f"   Company: {company}")
            print(f"   Status: {status}")
            print(f"   User ID: {user_id}")
            print(f"   Created: {created_at}")
            
            if project_id:
                print(f"   🔗 PROJECT ID: {project_id}")
                print(f"   🔗 Project Title: {project_title}")
            else:
                print(f"   🔗 No project association")
        
    except Exception as e:
        print(f"❌ Error checking jobs: {e}")
        conn.rollback()  # Rollback on error
    finally:
        if cursor:
            cursor.close()

def check_associations(conn):
    """Check job-project associations summary"""
    cursor = None
    try:
        cursor = conn.cursor()
        
        print(f"\n🔗 JOB-PROJECT ASSOCIATIONS")
        print("=" * 80)
        
        # Count jobs with and without project associations
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) as jobs_with_projects,
                COUNT(CASE WHEN project_id IS NULL THEN 1 END) as jobs_without_projects,
                COUNT(*) as total_jobs
            FROM job_listings
        """)
        
        result = cursor.fetchone()
        jobs_with_projects, jobs_without_projects, total_jobs = result
        
        print(f"Jobs with project association: {jobs_with_projects}")
        print(f"Jobs without project association: {jobs_without_projects}")
        print(f"Total jobs: {total_jobs}")
        
        # Show projects and their job counts (no 'name' column)
        cursor.execute("""
            SELECT p.id, p.title, COUNT(j.id) as job_count
            FROM projects p
            LEFT JOIN job_listings j ON p.id = j.project_id
            GROUP BY p.id, p.title
            ORDER BY job_count DESC, p.created_at DESC
        """)
        
        project_jobs = cursor.fetchall()
        
        if project_jobs:
            print(f"\nProjects and their job counts:")
            for project_id, title, job_count in project_jobs:
                print(f"  • {title} (ID: {project_id}): {job_count} jobs")
        
    except Exception as e:
        print(f"❌ Error checking associations: {e}")
        conn.rollback()  # Rollback on error
    finally:
        if cursor:
            cursor.close()

def main():
    """Main function to run database checks"""
    print("🔍 BoneBoard Database Inspector")
    print("=" * 50)
    
    conn = connect_to_database()
    if not conn:
        sys.exit(1)
    
    try:
        check_projects(conn)
        check_jobs(conn)
        check_associations(conn)
        
        print(f"\n✅ Database inspection complete!")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    main()
