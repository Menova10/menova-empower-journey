// api/migrations/create_community_tables.js
// Migration to create community-related tables in Supabase

export default async function createCommunityTables(supabaseClient) {
  try {
    // Create menova_communities table
    await supabaseClient.rpc('create_community_tables', {
      sql: `
        -- Create menova_communities table
        CREATE TABLE IF NOT EXISTS menova_communities (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL CHECK (type IN ('topic', 'location', 'experience')),
          image_url TEXT,
          is_official BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID REFERENCES auth.users(id)
        );

        -- Create community_memberships table
        CREATE TABLE IF NOT EXISTS community_memberships (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          community_id UUID NOT NULL REFERENCES menova_communities(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
          joined_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, community_id)
        );

        -- Create community_posts table
        CREATE TABLE IF NOT EXISTS community_posts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          community_id UUID NOT NULL REFERENCES menova_communities(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create community_events table
        CREATE TABLE IF NOT EXISTS community_events (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          community_id UUID NOT NULL REFERENCES menova_communities(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ,
          location TEXT,
          created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create Row Level Security policies
        ALTER TABLE menova_communities ENABLE ROW LEVEL SECURITY;
        ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;
        ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;

        -- Communities are viewable by all authenticated users
        CREATE POLICY "Communities viewable by all users" 
          ON menova_communities FOR SELECT USING (auth.role() = 'authenticated');

        -- Communities can be created by authenticated users
        CREATE POLICY "Communities creatable by authenticated users" 
          ON menova_communities FOR INSERT WITH CHECK (auth.role() = 'authenticated');

        -- Communities are editable by creator or admins
        CREATE POLICY "Communities editable by creator or admins" 
          ON menova_communities FOR UPDATE USING (
            auth.uid() = created_by OR 
            EXISTS (
              SELECT 1 FROM community_memberships 
              WHERE community_id = menova_communities.id 
              AND user_id = auth.uid() 
              AND role = 'admin'
            )
          );

        -- Memberships are viewable by all authenticated users
        CREATE POLICY "Memberships viewable by all users" 
          ON community_memberships FOR SELECT USING (auth.role() = 'authenticated');

        -- Memberships can be created by the user themselves
        CREATE POLICY "Memberships creatable by the user themselves" 
          ON community_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- Posts are viewable by community members
        CREATE POLICY "Posts viewable by community members" 
          ON community_posts FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM community_memberships 
              WHERE community_id = community_posts.community_id 
              AND user_id = auth.uid()
            )
          );

        -- Posts can be created by community members
        CREATE POLICY "Posts creatable by community members" 
          ON community_posts FOR INSERT WITH CHECK (
            auth.uid() = user_id AND
            EXISTS (
              SELECT 1 FROM community_memberships 
              WHERE community_id = community_posts.community_id 
              AND user_id = auth.uid()
            )
          );

        -- Events viewable by community members
        CREATE POLICY "Events viewable by community members" 
          ON community_events FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM community_memberships 
              WHERE community_id = community_events.community_id 
              AND user_id = auth.uid()
            )
          );

        -- Create some initial official communities
        INSERT INTO menova_communities (name, description, type, is_official)
        VALUES 
          ('Menopause Support', 'General discussion and support for women going through menopause', 'topic', true),
          ('Hot Flash Management', 'Tips and discussions on managing hot flashes', 'topic', true),
          ('Sleep Strategies', 'Sharing sleep challenges and solutions during menopause', 'topic', true),
          ('Hormone Therapy', 'Information and experiences with hormone replacement therapy', 'topic', true),
          ('Fitness & Wellness', 'Exercise and wellness routines tailored for menopausal women', 'topic', true);
      `
    });

    return { success: true, message: 'Community tables created successfully' };
  } catch (error) {
    console.error('Error creating community tables:', error);
    return { success: false, error: error.message };
  }
} 