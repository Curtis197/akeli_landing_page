INSERT INTO ingredient_category (code, name_fr, name_en)
VALUES ('fried_oil', 'Huile de friture', 'Frying Oil')
ON CONFLICT (code) DO NOTHING;
