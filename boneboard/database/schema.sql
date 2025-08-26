-- BoneBoard Database Schema
-- PostgreSQL Database Setup for Heroku

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (wallet-based authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    profile_type VARCHAR(20) DEFAULT 'user' CHECK (profile_type IN ('user', 'freelancer', 'client', 'both'))
);

-- Freelancer profiles
CREATE TABLE freelancer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    category VARCHAR(50),
    skills TEXT[], -- Array of skills
    languages TEXT[], -- Array of languages
    hourly_rate DECIMAL(10,2),
    location VARCHAR(100),
    timezone VARCHAR(50),
    rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    response_time VARCHAR(20) DEFAULT '1 hour',
    member_since TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT true,
    busy_status VARCHAR(20) DEFAULT 'available' CHECK (busy_status IN ('available', 'busy', 'unavailable')),
    social_links JSONB DEFAULT '{}',
    work_images TEXT[], -- Array of image URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service packages for freelancers (matches deployed database structure)
CREATE TABLE service_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    freelancer_id UUID REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    features TEXT[], -- Array of feature strings
    price NUMERIC NOT NULL,
    currency VARCHAR(10) DEFAULT 'ADA',
    delivery_time VARCHAR(50),
    package_type VARCHAR(20) NOT NULL CHECK (package_type IN ('basic', 'standard', 'premium')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    funding_goal DECIMAL(15,6) DEFAULT 0,
    logo TEXT,
    funding_address VARCHAR(255),
    discord_link VARCHAR(255),
    twitter_link VARCHAR(255),
    wallet_address VARCHAR(255) NOT NULL,
    payment_amount DECIMAL(10,2),
    payment_currency VARCHAR(10) DEFAULT 'BONE',
    tx_hash VARCHAR(128),
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'verified', 'completed', 'paused', 'cancelled')),
    website VARCHAR(255),
    logo_url TEXT,
    twitter_username VARCHAR(100),
    discord_invite VARCHAR(255),
    github_repo VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    verified_by VARCHAR(255), -- Admin wallet address who verified the project
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job listings
CREATE TABLE job_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL, -- Changed to match wallet address format
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    company VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Full-time', 'Part-time', 'Contract', 'Internship')),
    category VARCHAR(50) NOT NULL,
    salary VARCHAR(100),
    salary_type VARCHAR(20) DEFAULT 'fiat' CHECK (salary_type IN ('ADA', 'fiat', 'custom')),
    custom_payment_type VARCHAR(50),
    work_arrangement VARCHAR(20) DEFAULT 'remote' CHECK (work_arrangement IN ('remote', 'hybrid', 'onsite')),
    required_skills_text TEXT, -- Changed from array to text
    additional_info_text TEXT, -- Changed from array to text
    company_logo_url TEXT,
    company_website VARCHAR(255),
    contact_email VARCHAR(255),
    website VARCHAR(255),
    twitter VARCHAR(100),
    discord VARCHAR(255),
    how_to_apply TEXT,
    listing_duration INTEGER DEFAULT 30, -- days
    payment_currency VARCHAR(10) DEFAULT 'ADA' CHECK (payment_currency IN ('ADA', 'BONE')),
    payment_amount DECIMAL(10,2),
    tx_hash VARCHAR(128), -- Added missing field
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'paused', 'expired', 'filled')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job applications
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES job_listings(id) ON DELETE CASCADE,
    freelancer_id UUID REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
    cover_letter TEXT,
    proposed_rate DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, freelancer_id)
);

-- Enhanced Messages/Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1_wallet VARCHAR(255) NOT NULL, -- Use wallet addresses instead of user IDs
    participant_2_wallet VARCHAR(255) NOT NULL,
    participant_1_name VARCHAR(200),
    participant_1_avatar TEXT,
    participant_2_name VARCHAR(200),
    participant_2_avatar TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false,
    deleted_by VARCHAR(255),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(participant_1_wallet, participant_2_wallet)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_wallet VARCHAR(255) NOT NULL,
    sender_name VARCHAR(200),
    sender_avatar TEXT,
    receiver_wallet VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    is_read BOOLEAN DEFAULT false,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message attachments
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image' or 'file'
    file_url TEXT NOT NULL, -- Data URL or file path
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Response time tracking
CREATE TABLE freelancer_response_times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    freelancer_wallet VARCHAR(255) NOT NULL,
    response_time_minutes INTEGER NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews for freelancers
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    freelancer_id UUID REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES job_listings(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    service_title VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(freelancer_id, reviewer_id, job_id)
);

-- Saved jobs (user bookmarks)
CREATE TABLE saved_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES job_listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_id UUID, -- Can reference any table depending on type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_freelancer_profiles_user_id ON freelancer_profiles(user_id);
CREATE INDEX idx_freelancer_profiles_category ON freelancer_profiles(category);
CREATE INDEX idx_freelancer_profiles_rating ON freelancer_profiles(rating DESC);
CREATE INDEX idx_service_packages_freelancer_id ON service_packages(freelancer_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_job_listings_user_id ON job_listings(user_id);
CREATE INDEX idx_job_listings_category ON job_listings(category);
CREATE INDEX idx_job_listings_status ON job_listings(status);
CREATE INDEX idx_job_listings_created_at ON job_listings(created_at DESC);
CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_freelancer_id ON job_applications(freelancer_id);
CREATE INDEX idx_conversations_participants ON conversations(participant_1, participant_2);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_reviews_freelancer_id ON reviews(freelancer_id);
CREATE INDEX idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_freelancer_profiles_updated_at BEFORE UPDATE ON freelancer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_packages_updated_at BEFORE UPDATE ON service_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_listings_updated_at BEFORE UPDATE ON job_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- BONEBOARD CORE FEATURES

-- 1. SCAM WATCH SYSTEM
CREATE TABLE scam_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scam_type VARCHAR(50) NOT NULL CHECK (scam_type IN ('wallet_address', 'user', 'project', 'website', 'other')),
    scam_identifier VARCHAR(500) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[],
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'resolved')),
    ada_payment_amount DECIMAL(10,6),
    ada_tx_hash VARCHAR(128),
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE scam_report_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES scam_reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(report_id, user_id)
);

-- 2. PROJECT FUNDING SYSTEM
CREATE TABLE project_funding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    funding_goal DECIMAL(15,6),
    current_funding DECIMAL(15,6) DEFAULT 0,
    bone_posting_fee DECIMAL(10,2),
    bone_tx_hash VARCHAR(128),
    funding_deadline TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    is_funded BOOLEAN DEFAULT false,
    wallet_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE funding_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_funding_id UUID REFERENCES project_funding(id) ON DELETE CASCADE,
    contributor_wallet VARCHAR(255) NOT NULL,
    ada_amount DECIMAL(15,6) NOT NULL,
    ada_tx_hash VARCHAR(128) NOT NULL,
    message TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BLOCKCHAIN TRANSACTIONS
CREATE TABLE bone_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('job_posting', 'project_posting', 'scam_report', 'featured_listing', 'other')),
    bone_amount DECIMAL(10,2) NOT NULL,
    bone_tx_hash VARCHAR(128) NOT NULL,
    related_id UUID,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ada_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_wallet VARCHAR(255) NOT NULL,
    to_wallet VARCHAR(255) NOT NULL,
    ada_amount DECIMAL(15,6) NOT NULL,
    tx_hash VARCHAR(128) NOT NULL UNIQUE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('scam_report_fee', 'project_funding', 'other')),
    related_id UUID,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    block_height BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE wallet_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_name VARCHAR(50) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    stake_address VARCHAR(255),
    is_primary BOOLEAN DEFAULT true,
    last_connected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Missing tables for projects API compatibility
CREATE TABLE project_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    vote_type VARCHAR(10) CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, wallet_address)
);

CREATE TABLE project_fundings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    amount DECIMAL(15,6) NOT NULL,
    tx_hash VARCHAR(128) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Additional indexes for BoneBoard features
CREATE INDEX idx_scam_reports_type ON scam_reports(scam_type);
CREATE INDEX idx_scam_reports_status ON scam_reports(status);
CREATE INDEX idx_scam_reports_created_at ON scam_reports(created_at DESC);
CREATE INDEX idx_project_funding_project_id ON project_funding(project_id);
CREATE INDEX idx_project_funding_is_active ON project_funding(is_active);
CREATE INDEX idx_funding_contributions_project_id ON funding_contributions(project_funding_id);
CREATE INDEX idx_project_votes_project_id ON project_votes(project_id);
CREATE INDEX idx_project_fundings_project_id ON project_fundings(project_id);
CREATE INDEX idx_bone_transactions_user_id ON bone_transactions(user_id);
CREATE INDEX idx_bone_transactions_type ON bone_transactions(transaction_type);
CREATE INDEX idx_ada_transactions_tx_hash ON ada_transactions(tx_hash);
CREATE INDEX idx_ada_transactions_type ON ada_transactions(transaction_type);
CREATE INDEX idx_wallet_connections_user_id ON wallet_connections(user_id);

-- Platform settings for admin management
CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_listing_fee DECIMAL(10,2) DEFAULT 50.00,
    job_listing_fee DECIMAL(10,2) DEFAULT 25.00,
    project_listing_currency VARCHAR(10) DEFAULT 'BONE' CHECK (project_listing_currency IN ('ADA', 'BONE')),
    job_listing_currency VARCHAR(10) DEFAULT 'ADA' CHECK (job_listing_currency IN ('ADA', 'BONE')),
    updated_by VARCHAR(255) NOT NULL, -- Admin wallet address
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default platform settings
INSERT INTO platform_settings (project_listing_fee, job_listing_fee, project_listing_currency, job_listing_currency, updated_by)
VALUES (50.00, 25.00, 'BONE', 'ADA', 'system');

-- Admin activity log
CREATE TABLE admin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_wallet VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- 'project', 'job', 'settings', etc.
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Additional indexes for admin features
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_verified_by ON projects(verified_by);
CREATE INDEX idx_admin_activity_log_admin_wallet ON admin_activity_log(admin_wallet);
CREATE INDEX idx_admin_activity_log_action ON admin_activity_log(action);
CREATE INDEX idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);

-- Additional triggers
CREATE TRIGGER update_scam_reports_updated_at BEFORE UPDATE ON scam_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_funding_updated_at BEFORE UPDATE ON project_funding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
