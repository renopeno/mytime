-- Enable Row Level Security on all tables
-- Each user can only access their own data

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (auth.uid()::text = user_id);

-- Clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid()::text = user_id);

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid()::text = user_id);

-- Time entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own time_entries" ON time_entries FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own time_entries" ON time_entries FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own time_entries" ON time_entries FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own time_entries" ON time_entries FOR DELETE USING (auth.uid()::text = user_id);
