-- Function to make a user an admin
-- Run this in Supabase SQL Editor with your email

-- First, let's create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT raw_user_meta_data->>'role' INTO user_role
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To make yourself admin, run this (replace with your email):
-- UPDATE auth.users 
-- SET raw_user_meta_data = '{"role": "admin"}'::jsonb
-- WHERE email = 'deine-email@beispiel.com';
