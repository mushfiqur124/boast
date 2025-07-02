
-- First, let's add captains as participants for existing teams
-- We'll insert captains as participants if they don't already exist
INSERT INTO public.participants (name, team_id)
SELECT t.captain, t.id
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.participants p 
  WHERE p.name = t.captain AND p.team_id = t.id
);

-- Update the points_earned column to allow negative values (it should already support this as integer type)
-- But let's make sure by updating the column description
COMMENT ON COLUMN public.scores.points_earned IS 'Points earned from this score, can be negative for penalties';
