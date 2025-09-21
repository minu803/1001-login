-- ==========================================
-- ROW-LEVEL SECURITY (RLS) POLICIES - FIXED VERSION
-- 1001 Stories Volunteer Management System
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "volunteer_profiles_select_own" ON volunteer_profiles;
DROP POLICY IF EXISTS "volunteer_profiles_insert_own" ON volunteer_profiles;
DROP POLICY IF EXISTS "volunteer_profiles_update_own" ON volunteer_profiles;
DROP POLICY IF EXISTS "volunteer_applications_select_own" ON volunteer_applications;
DROP POLICY IF EXISTS "volunteer_applications_insert_own" ON volunteer_applications;
DROP POLICY IF EXISTS "volunteer_applications_update_own" ON volunteer_applications;

-- Enable RLS on all volunteer-related tables
ALTER TABLE volunteer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_certificates ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to get current user ID from session context
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true);
EXCEPTION 
  WHEN others THEN RETURN '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role from session context
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_role', true);
EXCEPTION 
  WHEN others THEN RETURN '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_user_role() = 'ADMIN';
EXCEPTION 
  WHEN others THEN RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is volunteer
CREATE OR REPLACE FUNCTION is_volunteer() RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_user_role() = 'VOLUNTEER';
EXCEPTION 
  WHEN others THEN RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- VOLUNTEER PROFILES POLICIES
-- ==========================================

-- Allow volunteers to view and update their own profiles
CREATE POLICY "volunteer_profiles_select_own" ON volunteer_profiles
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND "userId" = current_user_id())
  );

CREATE POLICY "volunteer_profiles_insert_own" ON volunteer_profiles
  FOR INSERT 
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "userId" = current_user_id())
  );

CREATE POLICY "volunteer_profiles_update_own" ON volunteer_profiles
  FOR UPDATE 
  USING (
    is_admin() OR 
    (is_volunteer() AND "userId" = current_user_id())
  )
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "userId" = current_user_id())
  );

-- ==========================================
-- VOLUNTEER APPLICATIONS POLICIES
-- ==========================================

-- Allow volunteers to view and manage their own applications
CREATE POLICY "volunteer_applications_select_own" ON volunteer_applications
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerUserId" = current_user_id())
  );

CREATE POLICY "volunteer_applications_insert_own" ON volunteer_applications
  FOR INSERT 
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "volunteerUserId" = current_user_id())
  );

CREATE POLICY "volunteer_applications_update_own" ON volunteer_applications
  FOR UPDATE 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerUserId" = current_user_id())
  )
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "volunteerUserId" = current_user_id())
  );

-- ==========================================
-- QUEST ASSIGNMENTS POLICIES
-- ==========================================

-- Allow volunteers to view and update their own quest assignments
CREATE POLICY "quest_assignments_select_own" ON quest_assignments
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  );

CREATE POLICY "quest_assignments_update_own" ON quest_assignments
  FOR UPDATE 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  )
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  );

-- ==========================================
-- VOLUNTEER EVIDENCE POLICIES
-- ==========================================

-- Allow volunteers to view and manage their own evidence
CREATE POLICY "volunteer_evidence_select_own" ON volunteer_evidence
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  );

CREATE POLICY "volunteer_evidence_insert_own" ON volunteer_evidence
  FOR INSERT 
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  );

CREATE POLICY "volunteer_evidence_update_own" ON volunteer_evidence
  FOR UPDATE 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  )
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  );

-- ==========================================
-- VOLUNTEER POINTS POLICIES
-- ==========================================

-- Allow volunteers to view their own points history
CREATE POLICY "volunteer_points_select_own" ON volunteer_points
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  );

-- Only admins can insert/update points
CREATE POLICY "volunteer_points_admin_manage" ON volunteer_points
  FOR ALL 
  USING (is_admin())
  WITH CHECK (is_admin());

-- ==========================================
-- VOLUNTEER REWARDS POLICIES
-- ==========================================

-- Allow all users to view available rewards (but no role restrictions)
CREATE POLICY "volunteer_rewards_select_all" ON volunteer_rewards
  FOR SELECT 
  USING (true);

-- Only admins can manage rewards
CREATE POLICY "volunteer_rewards_admin_manage" ON volunteer_rewards
  FOR ALL 
  USING (is_admin())
  WITH CHECK (is_admin());

-- ==========================================
-- VOLUNTEER REDEMPTIONS POLICIES
-- ==========================================

-- Allow volunteers to view and manage their own redemptions
CREATE POLICY "volunteer_redemptions_select_own" ON volunteer_redemptions
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  );

CREATE POLICY "volunteer_redemptions_insert_own" ON volunteer_redemptions
  FOR INSERT 
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  );

CREATE POLICY "volunteer_redemptions_update_own" ON volunteer_redemptions
  FOR UPDATE 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  )
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  );

-- ==========================================
-- MENTOR RELATIONS POLICIES
-- ==========================================

-- Allow volunteers to view mentorships they're involved in
CREATE POLICY "mentor_relations_select_own" ON mentor_relations
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND (
      "mentorId" IN (SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()) OR
      "menteeId" IN (SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id())
    ))
  );

CREATE POLICY "mentor_relations_update_own" ON mentor_relations
  FOR UPDATE 
  USING (
    is_admin() OR 
    (is_volunteer() AND (
      "mentorId" IN (SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()) OR
      "menteeId" IN (SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id())
    ))
  )
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND (
      "mentorId" IN (SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()) OR
      "menteeId" IN (SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id())
    ))
  );

-- ==========================================
-- VOLUNTEER MATCHES POLICIES
-- ==========================================

-- Allow volunteers to view their own matches
CREATE POLICY "volunteer_matches_select_own" ON volunteer_matches
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" IN (
      SELECT id FROM volunteer_profiles WHERE "userId" = current_user_id()
    ))
  );

-- Only admins can manage matches
CREATE POLICY "volunteer_matches_admin_manage" ON volunteer_matches
  FOR ALL 
  USING (is_admin())
  WITH CHECK (is_admin());

-- ==========================================
-- QUEST REVIEWS POLICIES
-- ==========================================

-- Allow volunteers to view and create their own quest reviews
CREATE POLICY "quest_reviews_select_own" ON quest_reviews
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND "reviewerId" = current_user_id())
  );

CREATE POLICY "quest_reviews_insert_own" ON quest_reviews
  FOR INSERT 
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "reviewerId" = current_user_id())
  );

CREATE POLICY "quest_reviews_update_own" ON quest_reviews
  FOR UPDATE 
  USING (
    is_admin() OR 
    (is_volunteer() AND "reviewerId" = current_user_id())
  )
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "reviewerId" = current_user_id())
  );

-- ==========================================
-- QUESTS POLICIES
-- ==========================================

-- Allow all users to view active quests, creators can manage their own
CREATE POLICY "quests_select_active" ON quests
  FOR SELECT 
  USING (
    is_admin() OR 
    (status = 'OPEN' AND "isActive" = true) OR
    ("creatorId" = current_user_id())
  );

-- Allow quest creators and admins to manage quests
CREATE POLICY "quests_manage_own" ON quests
  FOR ALL 
  USING (
    is_admin() OR 
    "creatorId" = current_user_id()
  )
  WITH CHECK (
    is_admin() OR 
    "creatorId" = current_user_id()
  );

-- ==========================================
-- VOLUNTEER PROJECTS POLICIES
-- ==========================================

-- Allow all users to view active projects
CREATE POLICY "volunteer_projects_select_active" ON volunteer_projects
  FOR SELECT 
  USING (
    is_admin() OR 
    status = 'OPEN' OR
    "coordinatorId" = current_user_id()
  );

-- Allow coordinators and admins to manage projects
CREATE POLICY "volunteer_projects_manage_own" ON volunteer_projects
  FOR ALL 
  USING (
    is_admin() OR 
    "coordinatorId" = current_user_id()
  )
  WITH CHECK (
    is_admin() OR 
    "coordinatorId" = current_user_id()
  );

-- ==========================================
-- VOLUNTEER HOURS POLICIES
-- ==========================================

-- Allow volunteers to view and manage their own hours
CREATE POLICY "volunteer_hours_select_own" ON volunteer_hours
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" = current_user_id())
  );

CREATE POLICY "volunteer_hours_insert_own" ON volunteer_hours
  FOR INSERT 
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" = current_user_id())
  );

CREATE POLICY "volunteer_hours_update_own" ON volunteer_hours
  FOR UPDATE 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" = current_user_id())
  )
  WITH CHECK (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" = current_user_id())
  );

-- ==========================================
-- VOLUNTEER CERTIFICATES POLICIES
-- ==========================================

-- Allow volunteers to view their own certificates
CREATE POLICY "volunteer_certificates_select_own" ON volunteer_certificates
  FOR SELECT 
  USING (
    is_admin() OR 
    (is_volunteer() AND "volunteerId" = current_user_id())
  );

-- Only admins can issue certificates
CREATE POLICY "volunteer_certificates_admin_manage" ON volunteer_certificates
  FOR ALL 
  USING (is_admin())
  WITH CHECK (is_admin());

-- ==========================================
-- INDEX OPTIMIZATIONS FOR RLS
-- ==========================================

-- Indexes to optimize RLS policy performance
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_user_id ON volunteer_profiles("userId");
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_user_id ON volunteer_applications("volunteerUserId");
CREATE INDEX IF NOT EXISTS idx_quest_assignments_volunteer_id ON quest_assignments("volunteerId");
CREATE INDEX IF NOT EXISTS idx_volunteer_evidence_volunteer_id ON volunteer_evidence("volunteerId");
CREATE INDEX IF NOT EXISTS idx_volunteer_points_volunteer_id ON volunteer_points("volunteerId");
CREATE INDEX IF NOT EXISTS idx_volunteer_redemptions_volunteer_id ON volunteer_redemptions("volunteerId");
CREATE INDEX IF NOT EXISTS idx_mentor_relations_mentor_id ON mentor_relations("mentorId");
CREATE INDEX IF NOT EXISTS idx_mentor_relations_mentee_id ON mentor_relations("menteeId");
CREATE INDEX IF NOT EXISTS idx_volunteer_matches_volunteer_id ON volunteer_matches("volunteerId");
CREATE INDEX IF NOT EXISTS idx_quest_reviews_reviewer_id ON quest_reviews("reviewerId");
CREATE INDEX IF NOT EXISTS idx_quests_creator_id ON quests("creatorId");
CREATE INDEX IF NOT EXISTS idx_volunteer_projects_coordinator_id ON volunteer_projects("coordinatorId");
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_volunteer_id ON volunteer_hours("volunteerId");
CREATE INDEX IF NOT EXISTS idx_volunteer_certificates_volunteer_id ON volunteer_certificates("volunteerId");

-- ==========================================
-- RLS STATUS CHECK FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT,
        c.relrowsecurity,
        COUNT(p.polname)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname LIKE '%volunteer%'
    GROUP BY c.relname, c.relrowsecurity
    ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMMENTS AND DOCUMENTATION
-- ==========================================

COMMENT ON FUNCTION current_user_id() IS 'Returns the current user ID from session context for RLS policies';
COMMENT ON FUNCTION current_user_role() IS 'Returns the current user role from session context for RLS policies';
COMMENT ON FUNCTION is_admin() IS 'Checks if the current user has ADMIN role';
COMMENT ON FUNCTION is_volunteer() IS 'Checks if the current user has VOLUNTEER role';
COMMENT ON FUNCTION check_rls_status() IS 'Returns the RLS status and policy count for volunteer tables';

-- Add table comments explaining RLS implementation
COMMENT ON TABLE volunteer_profiles IS 'Volunteer profiles with RLS: volunteers can only access their own profile, admins can access all';
COMMENT ON TABLE volunteer_applications IS 'Volunteer applications with RLS: volunteers can only access their own applications, admins can access all';
COMMENT ON TABLE quest_assignments IS 'Quest assignments with RLS: volunteers can only access their own assignments, admins can access all';
COMMENT ON TABLE volunteer_evidence IS 'Volunteer evidence with RLS: volunteers can only access their own evidence, admins can access all';
COMMENT ON TABLE volunteer_points IS 'Volunteer points with RLS: volunteers can view their own points, only admins can modify';
COMMENT ON TABLE volunteer_rewards IS 'Volunteer rewards with RLS: all users can view, only admins can modify';
COMMENT ON TABLE volunteer_redemptions IS 'Volunteer redemptions with RLS: volunteers can only access their own redemptions, admins can access all';
COMMENT ON TABLE mentor_relations IS 'Mentor relations with RLS: volunteers can only access mentorships they are involved in, admins can access all';
COMMENT ON TABLE volunteer_matches IS 'Volunteer matches with RLS: volunteers can view their own matches, only admins can modify';
COMMENT ON TABLE quest_reviews IS 'Quest reviews with RLS: volunteers can only access their own reviews, admins can access all';
COMMENT ON TABLE quests IS 'Quests with RLS: all users can view active quests, creators and admins can modify their own';
COMMENT ON TABLE volunteer_projects IS 'Volunteer projects with RLS: all users can view active projects, coordinators and admins can modify their own';
COMMENT ON TABLE volunteer_hours IS 'Volunteer hours with RLS: volunteers can only access their own hours, admins can access all';
COMMENT ON TABLE volunteer_certificates IS 'Volunteer certificates with RLS: volunteers can view their own certificates, only admins can issue';