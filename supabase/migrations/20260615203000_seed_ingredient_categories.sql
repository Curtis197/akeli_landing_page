-- supabase/migrations/20260615203000_seed_ingredient_categories.sql
INSERT INTO public.ingredient_category (code, name_fr, name_en, name_ar)
VALUES
  ('liquid',    'Liquide',                'Liquid',          'سائل'),
  ('oil',       'Huile & Matière grasse', 'Oil & Fat',       'زيت ودهون'),
  ('fried_oil', 'Huile de friture',       'Frying Oil',      'زيت للقلي'),
  ('meat',      'Viande',                 'Meat',            'لحوم'),
  ('poultry',   'Volaille',               'Poultry',         'دواجن'),
  ('seafood',   'Poisson & Fruits de mer','Seafood',         'مأكولات بحرية'),
  ('vegetable', 'Légume',                 'Vegetable',       'خضار'),
  ('fruit',     'Fruit',                  'Fruit',           'فاكهة'),
  ('dairy',     'Laitage & Œuf',          'Dairy & Egg',     'ألبان وبيض'),
  ('grain',     'Céréale & Pâte',         'Grain & Pasta',   'حبوب ومعكرونة'),
  ('spice',     'Épice',                  'Spice',           'توابل'),
  ('herb',      'Herbe',                  'Herb',            'أعشاب'),
  ('condiment', 'Condiment',              'Condiment',       'صلصات'),
  ('baking',    'Boulangerie',            'Baking',          'مخبوزات'),
  ('nut',       'Noix & Graine',          'Nut & Seed',      'مكسرات وبذور'),
  ('legume',    'Légumineuse',            'Legume',          'بقوليات'),
  ('sweetener', 'Sucre & Édulcorant',     'Sweetener',       'محليات'),
  ('alcohol',   'Alcool',                 'Alcohol',         'كحول'),
  ('other',     'Autre',                  'Other',           'أخرى')
ON CONFLICT (code) DO UPDATE SET
  name_fr = EXCLUDED.name_fr,
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar;
