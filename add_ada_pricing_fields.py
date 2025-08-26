#!/usr/bin/env python3
"""
Add ADA Pricing Fields to Platform Settings
Adds separate ADA pricing columns to the platform_settings table
"""

import psycopg2
import sys

# Database connection URL
DATABASE_URL = ""

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

def add_ada_pricing_fields(conn):
    """Add ADA pricing fields to platform_settings table"""
    try:
        cursor = conn.cursor()
        
        print("🔧 Adding ADA pricing fields to platform_settings table...")
        
        # Add new columns for ADA pricing
        cursor.execute("""
            ALTER TABLE platform_settings 
            ADD COLUMN IF NOT EXISTS project_listing_fee_ada DECIMAL(10,2) DEFAULT 50.00,
            ADD COLUMN IF NOT EXISTS job_listing_fee_ada DECIMAL(10,2) DEFAULT 25.00;
        """)
        
        print("✅ Added ADA pricing columns")
        
        # Update existing records to have ADA pricing
        cursor.execute("""
            UPDATE platform_settings 
            SET 
                project_listing_fee_ada = COALESCE(project_listing_fee_ada, 50.00),
                job_listing_fee_ada = COALESCE(job_listing_fee_ada, 25.00)
            WHERE project_listing_fee_ada IS NULL OR job_listing_fee_ada IS NULL;
        """)
        
        print("✅ Updated existing records with default ADA pricing")
        
        # Update the default BONE pricing to higher amounts
        cursor.execute("""
            UPDATE platform_settings 
            SET 
                project_listing_fee = 500.00,
                job_listing_fee = 250.00
            WHERE project_listing_fee = 50.00 AND job_listing_fee = 25.00;
        """)
        
        print("✅ Updated BONE pricing to new amounts (500 BONE for projects, 250 BONE for jobs)")
        
        # Add wallet_address column to saved_jobs if it doesn't exist
        cursor.execute("""
            ALTER TABLE saved_jobs 
            ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(255);
        """)
        
        print("✅ Added wallet_address column to saved_jobs table")
        
        # Create index for wallet_address in saved_jobs
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_saved_jobs_wallet_address ON saved_jobs(wallet_address);
        """)
        
        print("✅ Created index for saved_jobs wallet_address")
        
        # Add comments to document the pricing structure
        cursor.execute("""
            COMMENT ON COLUMN platform_settings.project_listing_fee IS 'Base price in BONE tokens for project listings (1 month)';
        """)
        
        cursor.execute("""
            COMMENT ON COLUMN platform_settings.job_listing_fee IS 'Base price in BONE tokens for job listings (1 month)';
        """)
        
        cursor.execute("""
            COMMENT ON COLUMN platform_settings.project_listing_fee_ada IS 'Alternative price in ADA for project listings (1 month)';
        """)
        
        cursor.execute("""
            COMMENT ON COLUMN platform_settings.job_listing_fee_ada IS 'Alternative price in ADA for job listings (1 month)';
        """)
        
        print("✅ Added column comments for documentation")
        
        # Commit all changes
        conn.commit()
        print("✅ All changes committed successfully")
        
        # Show current pricing settings
        cursor.execute("SELECT * FROM platform_settings ORDER BY created_at DESC LIMIT 1;")
        settings = cursor.fetchone()
        
        if settings:
            print("\n📊 Current Platform Pricing:")
            print(f"   Project Listing - BONE: {settings[1]} | ADA: {settings[5]}")
            print(f"   Job Listing - BONE: {settings[2]} | ADA: {settings[6]}")
            print(f"   Last Updated: {settings[8]}")
            print(f"   Updated By: {settings[7]}")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error adding ADA pricing fields: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        conn.rollback()
        return False
    
    return True

def main():
    """Main function"""
    print("🚀 BoneBoard ADA Pricing Migration Script")
    print("=" * 50)
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        sys.exit(1)
    
    try:
        # Add ADA pricing fields
        success = add_ada_pricing_fields(conn)
        
        if success:
            print("\n🎉 Migration completed successfully!")
            print("\n💡 New pricing structure:")
            print("   • BONE: 500 for projects, 250 for jobs")
            print("   • ADA: 50 for projects, 25 for jobs")
            print("   • Base price is for 1-month listings")
            print("   • Duration discounts: 2mo (5%), 3mo (10%), 6mo (15%), 12mo (20%)")
            print("   • Project listings get 20% discount")
            print("   • Featured listings cost +50%")
        else:
            print("\n❌ Migration failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            print("\n🔌 Database connection closed")

if __name__ == "__main__":
    main()
