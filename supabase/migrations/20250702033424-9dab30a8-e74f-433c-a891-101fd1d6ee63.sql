
-- Add a column to track individual participant scores for individual activities
ALTER TABLE public.scores 
ADD COLUMN individual_score numeric DEFAULT NULL;

-- Add a column to track if this is an individual participant score vs team total
ALTER TABLE public.scores 
ADD COLUMN score_type text DEFAULT 'team' CHECK (score_type IN ('team', 'individual'));

-- Update existing records to mark them as 'team' scores
UPDATE public.scores SET score_type = 'team' WHERE score_type IS NULL;

-- Make score_type not null after setting defaults
ALTER TABLE public.scores ALTER COLUMN score_type SET NOT NULL;
