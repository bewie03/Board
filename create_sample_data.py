#!/usr/bin/env python3
"""
BoneBoard Sample Data Creator
Creates 5 example projects and 1 job listing under each project for testing
"""

import psycopg2
import uuid
from datetime import datetime, timedelta
import random

# Database connection URL
DATABASE_URL = "postgres://u94m20d9lk1e7b:p73a59938021d84383fb460ad5c478003087a16d6038c9e19d6470d2400f1401e@c3v5n5ajfopshl.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d6nclr86s438p6"

# Target wallet address
WALLET_ADDRESS = "addr1q9l3t0hzcfdf3h9ewvz9x6pm9pm0swds3ghmazv97wcktljtq67mkhaxfj2zv5umsedttjeh0j3xnnew0gru6qywqy9s9j7x4d"

def connect_to_database():
    """Connect to the PostgreSQL database"""
    try:
        print("🔌 Connecting to BoneBoard database...")
        conn = psycopg2.connect(
            DATABASE_URL,
            connect_timeout=10,
            options='-c statement_timeout=30000'
        )
        print("✅ Connected successfully")
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def create_sample_projects_and_jobs(conn):
    """Create 5 sample projects with 1 job each"""
    try:
        cursor = conn.cursor()
        
        # Sample project data
        projects_data = [
            {
                "title": "CardanoSwap DEX",
                "description": "A decentralized exchange built on Cardano with advanced AMM features, yield farming, and governance tokens. Looking to revolutionize DeFi on Cardano.",
                "category": "DeFi",
                "logo": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&h=200&fit=crop&crop=center",
                "website": "https://cardanoswap.io",
                "twitter_link": "https://twitter.com/cardanoswap",
                "discord_link": "https://discord.gg/cardanoswap",
                "job": {
                    "title": "Senior Smart Contract Developer",
                    "company": "CardanoSwap DEX",
                    "description": "We're looking for an experienced Plutus developer to help build our next-generation DEX smart contracts. You'll work on AMM algorithms, liquidity pools, and governance mechanisms.",
                    "type": "Full-time",
                    "category": "Development",
                    "salary": "80,000 - 120,000 ADA",
                    "skills": "Plutus, Haskell, Smart Contracts, DeFi protocols",
                    "work_arrangement": "remote"
                }
            },
            {
                "title": "Cardano NFT Marketplace",
                "description": "The premier NFT marketplace for Cardano with advanced features like fractional ownership, NFT lending, and creator royalties. Supporting artists and collectors.",
                "category": "NFT",
                "logo": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop&crop=center",
                "website": "https://cardanonft.market",
                "twitter_link": "https://twitter.com/cardanonftmarket",
                "discord_link": "https://discord.gg/cardanonft",
                "job": {
                    "title": "Frontend React Developer",
                    "company": "Cardano NFT Marketplace",
                    "description": "Join our team to build beautiful, responsive interfaces for our NFT marketplace. Experience with Web3 integration and Cardano wallet connections required.",
                    "type": "Contract",
                    "category": "Development",
                    "salary": "50 - 80 ADA/hour",
                    "skills": "React, TypeScript, Web3, Cardano wallets, UI/UX",
                    "work_arrangement": "remote"
                }
            },
            {
                "title": "Cardano Gaming Platform",
                "description": "A blockchain gaming ecosystem featuring play-to-earn mechanics, NFT integration, and tournament systems. Building the future of gaming on Cardano.",
                "category": "Gaming",
                "logo": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&h=200&fit=crop&crop=center",
                "website": "https://cardanogaming.gg",
                "twitter_link": "https://twitter.com/cardanogaming",
                "discord_link": "https://discord.gg/cardanogaming",
                "job": {
                    "title": "Game Designer & Tokenomics Specialist",
                    "company": "Cardano Gaming Platform",
                    "description": "Design engaging game mechanics and sustainable tokenomics for our play-to-earn games. Experience with game design and blockchain economics essential.",
                    "type": "Full-time",
                    "category": "Design",
                    "salary": "60,000 - 90,000 ADA",
                    "skills": "Game Design, Tokenomics, Blockchain Gaming, Economics",
                    "work_arrangement": "hybrid"
                }
            },
            {
                "title": "Cardano Identity Solution",
                "description": "Decentralized identity management system built on Cardano, enabling secure, privacy-preserving digital identity verification for individuals and organizations.",
                "category": "Identity",
                "logo": "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=200&h=200&fit=crop&crop=center",
                "website": "https://cardanoid.io",
                "twitter_link": "https://twitter.com/cardanoid",
                "discord_link": "https://discord.gg/cardanoid",
                "job": {
                    "title": "Blockchain Security Engineer",
                    "company": "Cardano Identity Solution",
                    "description": "Lead security architecture for our identity platform. Expertise in cryptography, zero-knowledge proofs, and blockchain security protocols required.",
                    "type": "Full-time",
                    "category": "Security",
                    "salary": "90,000 - 130,000 ADA",
                    "skills": "Cryptography, Zero-Knowledge Proofs, Security Auditing, Blockchain",
                    "work_arrangement": "remote"
                }
            },
            {
                "title": "Cardano Analytics Dashboard",
                "description": "Comprehensive analytics and data visualization platform for the Cardano ecosystem. Real-time metrics, DeFi tracking, and market analysis tools.",
                "category": "Analytics",
                "logo": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=200&fit=crop&crop=center",
                "website": "https://cardanoanalytics.io",
                "twitter_link": "https://twitter.com/cardanoanalytics",
                "discord_link": "https://discord.gg/cardanoanalytics",
                "job": {
                    "title": "Data Engineer & Blockchain Analyst",
                    "company": "Cardano Analytics Dashboard",
                    "description": "Build data pipelines and analytics systems for Cardano blockchain data. Experience with big data, ETL processes, and blockchain indexing required.",
                    "type": "Part-time",
                    "category": "Data",
                    "salary": "40 - 60 ADA/hour",
                    "skills": "Python, SQL, Data Engineering, Blockchain Indexing, Analytics",
                    "work_arrangement": "remote"
                }
            }
        ]
        
        print(f"\n🚀 Creating {len(projects_data)} sample projects and jobs...")
        
        created_projects = []
        created_jobs = []
        
        for i, project_data in enumerate(projects_data, 1):
            # Create project
            project_id = str(uuid.uuid4())
            expires_at = datetime.now() + timedelta(days=90)
            
            project_query = """
                INSERT INTO projects (
                    id, title, description, category, logo, website, 
                    twitter_link, discord_link, wallet_address, 
                    payment_amount, payment_currency, status, 
                    expires_at, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id, title;
            """
            
            cursor.execute(project_query, (
                project_id,
                project_data["title"],
                project_data["description"],
                project_data["category"],
                project_data["logo"],
                project_data["website"],
                project_data["twitter_link"],
                project_data["discord_link"],
                WALLET_ADDRESS,
                50.00,  # payment_amount
                "BONE",  # payment_currency
                "active",  # status
                expires_at,
                datetime.now(),
                datetime.now()
            ))
            
            project_result = cursor.fetchone()
            created_projects.append(project_result)
            print(f"  ✅ Created project {i}: {project_result[1]}")
            
            # Create job for this project
            job_data = project_data["job"]
            job_id = str(uuid.uuid4())
            job_expires_at = datetime.now() + timedelta(days=30)
            
            job_query = """
                INSERT INTO job_listings (
                    id, user_id, project_id, title, company, description, 
                    type, category, salary, salary_type, work_arrangement, 
                    required_skills_text, payment_currency, payment_amount,
                    status, expires_at, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id, title;
            """
            
            cursor.execute(job_query, (
                job_id,
                WALLET_ADDRESS,  # user_id
                project_id,      # project_id - THIS IS THE KEY LINK
                job_data["title"],
                job_data["company"],
                job_data["description"],
                job_data["type"],
                job_data["category"],
                job_data["salary"],
                "ADA",  # salary_type - FIXED: must be 'ADA', 'fiat', or 'custom'
                job_data["work_arrangement"],
                job_data["skills"],
                "ADA",  # payment_currency
                25.00,  # payment_amount
                "active",  # status
                job_expires_at,
                datetime.now(),
                datetime.now()
            ))
            
            job_result = cursor.fetchone()
            created_jobs.append(job_result)
            print(f"    📋 Created job: {job_result[1]}")
        
        # Commit all changes
        conn.commit()
        
        print(f"\n🎉 Successfully created:")
        print(f"  • {len(created_projects)} projects")
        print(f"  • {len(created_jobs)} job listings")
        print(f"  • All linked to wallet: {WALLET_ADDRESS}")
        
        # Verify the relationships
        print(f"\n🔍 Verifying project-job relationships...")
        cursor.execute("""
            SELECT p.title as project_title, j.title as job_title, j.project_id
            FROM projects p 
            JOIN job_listings j ON p.id = j.project_id 
            WHERE p.wallet_address = %s
            ORDER BY p.created_at;
        """, (WALLET_ADDRESS,))
        
        relationships = cursor.fetchall()
        print(f"  Found {len(relationships)} project-job relationships:")
        for project_title, job_title, project_id in relationships:
            print(f"    • {project_title} → {job_title}")
        
        cursor.close()
        return True
        
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        conn.rollback()
        return False

def main():
    """Main function"""
    print("🚀 BoneBoard Sample Data Creator")
    print("=" * 50)
    print(f"Target wallet: {WALLET_ADDRESS}")
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        # Create sample data
        success = create_sample_projects_and_jobs(conn)
        
        if success:
            print(f"\n✅ Sample data creation completed successfully!")
            print(f"\n📋 What was created:")
            print(f"  • 5 diverse Cardano ecosystem projects")
            print(f"  • 1 job listing per project (5 total jobs)")
            print(f"  • All linked via project_id foreign key")
            print(f"  • Ready to test CASCADE delete functionality")
            print(f"\n💡 Next steps:")
            print(f"  • Visit the Projects page to see the new projects")
            print(f"  • Try deleting a project to test if jobs are CASCADE deleted")
            print(f"  • Check the Jobs page to see the new job listings")
        else:
            print(f"\n❌ Sample data creation failed!")
            
    finally:
        conn.close()
        print(f"\n🔌 Database connection closed")

if __name__ == "__main__":
    main()
