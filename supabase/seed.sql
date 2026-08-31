-- Seed categories for 5Pixels V1.
INSERT INTO public.categories (slug, name, description, sort_order, is_active)
VALUES
  ('portrait', 'Portrait', 'Professional and stylized portraits.', 10, true),
  ('cinematic', 'Cinematic', 'Dramatic lighting and film looks.', 20, true),
  ('illustration', 'Illustration', 'Painted, drawn, or illustrated styles.', 30, true),
  ('covers', 'Covers', 'Magazine covers, album art, and posters.', 40, true),
  ('retro', 'Retro', 'Vintage and nostalgic aesthetics.', 50, true),
  ('professional', 'Professional', 'Business-ready headshots and profiles.', 60, true),
  ('fantasy', 'Fantasy', 'Fantastical characters and scenes.', 70, true),
  ('seasonal', 'Seasonal', 'Holiday and seasonal themes.', 80, true)
ON CONFLICT (slug) DO NOTHING;
