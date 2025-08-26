#!/usr/bin/env python3
"""
BoneBoard Admin Schema Installer
Checks for admin-related database tables and creates them if missing
Ensures: platform_settings, admin_activity_log tables and project status field exist
"""

import psycopg2
import sys

# Database connection URL
DATABASE_URL = ""

def connect_to_database():
    """Connect to the PostgreSQL database"""
    try:
        print("🔌 Connecting to BoneBoard database...")
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Connected successfully")
        return conn
    except ImportError as e:
        print(f"❌ psycopg2 not installed: {e}")
        print("💡 Try: pip install psycopg2-binary")
        return None
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return None

def check_table_exists(cursor, table_name):
    """Check if a table exists in the database"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = %s
        );
    """, (table_name,))
    return cursor.fetchone()[0]

def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s
        );
    """, (table_name, column_name))
    return cursor.fetchone()[0]

def create_platform_settings_table(cursor):
    """Create the platform_settings table"""
    print("📋 Creating platform_settings table...")
    cursor.execute("""
        CREATE TABLE platform_settings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            project_listing_fee DECIMAL(10,2) NOT NULL DEFAULT 50.00,
            job_listing_fee DECIMAL(10,2) NOT NULL DEFAULT 25.00,
            project_listing_currency VARCHAR(10) DEFAULT 'BONE' CHECK (project_listing_currency IN ('ADA', 'BONE')),
            job_listing_currency VARCHAR(10) DEFAULT 'ADA' CHECK (job_listing_currency IN ('ADA', 'BONE')),
            updated_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    
    # Insert default settings
    cursor.execute("""
        INSERT INTO platform_settings (project_listing_fee, job_listing_fee, project_listing_currency, job_listing_currency, updated_by)
        VALUES (50.00, 25.00, 'BONE', 'ADA', 'system');
    """)
    print("   ✅ platform_settings table created with default values")

def create_admin_activity_log_table(cursor):
    """Create the admin_activity_log table"""
    print("📋 Creating admin_activity_log table...")
    cursor.execute("""
        CREATE TABLE admin_activity_log (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            admin_wallet VARCHAR(255) NOT NULL,
            action VARCHAR(100) NOT NULL,
            target_type VARCHAR(50) NOT NULL,
            target_id VARCHAR(255),
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX idx_admin_activity_log_admin_wallet ON admin_activity_log(admin_wallet);")
    cursor.execute("CREATE INDEX idx_admin_activity_log_action ON admin_activity_log(action);")
    cursor.execute("CREATE INDEX idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);")
    print("   ✅ admin_activity_log table created with indexes")

def add_project_status_fields(cursor):
    """Add status and verification fields to projects table"""
    print("📋 Adding admin fields to projects table...")
    
    # Add status column if it doesn't exist
    if not check_column_exists(cursor, 'projects', 'status'):
        cursor.execute("""
            ALTER TABLE projects 
            ADD COLUMN status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected'));
        """)
        print("   ✅ Added status column to projects")
    else:
        print("   ℹ️ status column already exists in projects")
    
    # Add verified_by column if it doesn't exist
    if not check_column_exists(cursor, 'projects', 'verified_by'):
        cursor.execute("""
            ALTER TABLE projects 
            ADD COLUMN verified_by VARCHAR(255);
        """)
        print("   ✅ Added verified_by column to projects")
    else:
        print("   ℹ️ verified_by column already exists in projects")
    
    # Add verified_at column if it doesn't exist
    if not check_column_exists(cursor, 'projects', 'verified_at'):
        cursor.execute("""
            ALTER TABLE projects 
            ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
        """)
        print("   ✅ Added verified_at column to projects")
    else:
        print("   ℹ️ verified_at column already exists in projects")

def create_update_trigger(cursor):
    """Create update trigger function if it doesn't exist"""
    print("📋 Ensuring update trigger exists...")
    cursor.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    
    # Add trigger to platform_settings if table exists
    if check_table_exists(cursor, 'platform_settings'):
        cursor.execute("""
            DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
            CREATE TRIGGER update_platform_settings_updated_at 
            BEFORE UPDATE ON platform_settings 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """)
        print("   ✅ Update trigger created for platform_settings")

def install_admin_schema(conn):
    """Install all admin-related schema components"""
    try:
        cursor = conn.cursor()
        
        print("🔍 Checking admin schema components...")
        
        # Check and create platform_settings table
        if not check_table_exists(cursor, 'platform_settings'):
            create_platform_settings_table(cursor)
        else:
            print("   ℹ️ platform_settings table already exists")
        
        # Check and create admin_activity_log table
        if not check_table_exists(cursor, 'admin_activity_log'):
            create_admin_activity_log_table(cursor)
        else:
            print("   ℹ️ admin_activity_log table already exists")
        
        # Check and add project admin fields
        if check_table_exists(cursor, 'projects'):
            add_project_status_fields(cursor)
        else:
            print("   ⚠️ projects table not found - skipping admin field additions")
        
        # Create update triggers
        create_update_trigger(cursor)
        
        conn.commit()
        cursor.close()
        
        print("\n🎉 Admin schema installation completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error installing admin schema: {e}")
        conn.rollback()
        return False

def check_admin_schema(conn):
    """Check the current state of admin schema"""
    try:
        cursor = conn.cursor()
        
        print("\n📊 Admin Schema Status:")
        
        # Check platform_settings table
        if check_table_exists(cursor, 'platform_settings'):
            cursor.execute("SELECT COUNT(*) FROM platform_settings;")
            count = cursor.fetchone()[0]
            print(f"   ✅ platform_settings table exists ({count} records)")
        else:
            print("   ❌ platform_settings table missing")
        
        # Check admin_activity_log table
        if check_table_exists(cursor, 'admin_activity_log'):
            cursor.execute("SELECT COUNT(*) FROM admin_activity_log;")
            count = cursor.fetchone()[0]
            print(f"   ✅ admin_activity_log table exists ({count} records)")
        else:
            print("   ❌ admin_activity_log table missing")
        
        # Check projects admin fields
        if check_table_exists(cursor, 'projects'):
            status_exists = check_column_exists(cursor, 'projects', 'status')
            verified_by_exists = check_column_exists(cursor, 'projects', 'verified_by')
            verified_at_exists = check_column_exists(cursor, 'projects', 'verified_at')
            
            print(f"   Projects table admin fields:")
            print(f"     status: {'✅' if status_exists else '❌'}")
            print(f"     verified_by: {'✅' if verified_by_exists else '❌'}")
            print(f"     verified_at: {'✅' if verified_at_exists else '❌'}")
        else:
            print("   ⚠️ projects table not found")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error checking admin schema: {e}")

def main():
    """Main function to handle command line operations"""
    print("🚀 BoneBoard Admin Schema Installer Starting...")
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python admin_schema_installer.py install    - Install missing admin schema")
        print("  python admin_schema_installer.py check      - Check admin schema status")
        print("\n💡 Example: python admin_schema_installer.py install")
        return
    
    command = sys.argv[1].lower()
    print(f"📋 Command: {command}")
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        print("❌ Failed to connect to database. Exiting.")
        return
    
    try:
        if command == "install":
            install_admin_schema(conn)
            
        elif command == "check":
            check_admin_schema(conn)
            
        else:
            print(f"❌ Unknown command: {command}")
            print("Available commands: install, check")
            
    finally:
        conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    main()
