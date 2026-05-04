-- Update Admin Password to Bcrypt Hash
-- Default Password: 'admin123'
-- Hash: $2b$10$gozKeogcPH4Rht7ocnGHl.ssh5.3.c6KI4HKJgXhdC8RscyOKBvN2

UPDATE public.staff_members
SET password = '$2b$10$gozKeogcPH4Rht7ocnGHl.ssh5.3.c6KI4HKJgXhdC8RscyOKBvN2'
WHERE username = 'admin';
