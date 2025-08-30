#!/usr/bin/env python3
"""
Add Funding Pricing Columns to Platform Settings
Adds the necessary columns for funding campaign pricing to the platform_settings table
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

def add_funding_pricing_columns(conn):
    """Add funding pricing columns to platform_settings table"""
    try:
        cursor = conn.cursor()
        
        print("📋 Checking current platform_settings table structure...")
        
        # Check current columns
        cursor.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'platform_settings' 
            ORDER BY ordinal_position;
        """)
        
        current_columns = cursor.fetchall()
        print("Current columns:")
        for col in current_columns:
            print(f"  - {col[0]} ({col[1]}) default: {col[2]}")
        
        # Check if funding columns already exist
        column_names = [col[0] for col in current_columns]
        
        columns_to_add = []
        if 'funding_listing_fee' not in column_names:
            columns_to_add.append('funding_listing_fee')
        if 'funding_listing_fee_ada' not in column_names:
            columns_to_add.append('funding_listing_fee_ada')
        if 'funding_listing_currency' not in column_names:
            columns_to_add.append('funding_listing_currency')
        if 'project_listing_fee_ada' not in column_names:
            columns_to_add.append('project_listing_fee_ada')
        if 'job_listing_fee_ada' not in column_names:
            columns_to_add.append('job_listing_fee_ada')
        
        if not columns_to_add:
            print("✅ All funding pricing columns already exist!")
            return True
        
        print(f"🔧 Adding missing columns: {', '.join(columns_to_add)}")
        
        # Add missing columns one by one
        if 'funding_listing_fee' in columns_to_add:
            print("  Adding funding_listing_fee column...")
            cursor.execute("""
                ALTER TABLE platform_settings 
                ADD COLUMN funding_listing_fee DECIMAL(10,2) DEFAULT 500.00;
            """)
        
        if 'funding_listing_fee_ada' in columns_to_add:
            print("  Adding funding_listing_fee_ada column...")
            cursor.execute("""
                ALTER TABLE platform_settings 
                ADD COLUMN funding_listing_fee_ada DECIMAL(10,2) DEFAULT 50.00;
            """)
        
        if 'funding_listing_currency' in columns_to_add:
            print("  Adding funding_listing_currency column...")
            cursor.execute("""
                ALTER TABLE platform_settings 
                ADD COLUMN funding_listing_currency VARCHAR(10) DEFAULT 'BONE' 
                CHECK (funding_listing_currency IN ('ADA', 'BONE'));
            """)
        
        if 'project_listing_fee_ada' in columns_to_add:
            print("  Adding project_listing_fee_ada column...")
            cursor.execute("""
                ALTER TABLE platform_settings 
                ADD COLUMN project_listing_fee_ada DECIMAL(10,2) DEFAULT 50.00;
            """)
        
        if 'job_listing_fee_ada' in columns_to_add:
            print("  Adding job_listing_fee_ada column...")
            cursor.execute("""
                ALTER TABLE platform_settings 
                ADD COLUMN job_listing_fee_ada DECIMAL(10,2) DEFAULT 25.00;
            """)
        
        # Update existing records with default values
        print("🔄 Updating existing records with default values...")
        cursor.execute("""
            UPDATE platform_settings 
            SET 
                funding_listing_fee = COALESCE(funding_listing_fee, 500.00),
                funding_listing_fee_ada = COALESCE(funding_listing_fee_ada, 50.00),
                funding_listing_currency = COALESCE(funding_listing_currency, 'BONE'),
                project_listing_fee_ada = COALESCE(project_listing_fee_ada, 50.00),
                job_listing_fee_ada = COALESCE(job_listing_fee_ada, 25.00);
        """)
        
        # Commit the changes
        conn.commit()
        
        print("✅ Successfully added funding pricing columns!")
        
        # Verify the changes
        print("📋 Updated table structure:")
        cursor.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'platform_settings' 
            ORDER BY ordinal_position;
        """)
        
        updated_columns = cursor.fetchall()
        for col in updated_columns:
            print(f"  - {col[0]} ({col[1]}) default: {col[2]}")
        
        # Show current settings
        print("\n📊 Current platform settings:")
        cursor.execute("SELECT * FROM platform_settings ORDER BY created_at DESC LIMIT 1;")
        settings = cursor.fetchone()
        if settings:
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'platform_settings' ORDER BY ordinal_position;")
            column_names = [desc[0] for desc in cursor.fetchall()]
            for i, value in enumerate(settings):
                print(f"  {column_names[i]}: {value}")
        
        cursor.close()
        return True
        
    except Exception as e:
        print(f"❌ Error adding funding pricing columns: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        conn.rollback()
        return False

def main():
    """Main function"""
    print("🚀 Starting funding pricing columns migration...")
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        sys.exit(1)
    
    try:
        # Add funding pricing columns
        success = add_funding_pricing_columns(conn)
        
        if success:
            print("🎉 Migration completed successfully!")
        else:
            print("💥 Migration failed!")
            sys.exit(1)
            
    finally:
        conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    main()
