-- Drop existing view
DROP VIEW IF EXISTS public.public_profiles;

-- Re-create view with role from user_roles
CREATE VIEW public.public_profiles AS
SELECT 
  p.id,
  p.name,
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.social_links,
  p.created_at,
  p.updated_at,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id;

-- Grant access
GRANT SELECT ON public.public_profiles TO authenticated, anon;
