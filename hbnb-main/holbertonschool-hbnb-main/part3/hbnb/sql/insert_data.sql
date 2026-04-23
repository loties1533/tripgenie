-- 1. Utilisateurs (Admin et Jean)
-- MDP pour les deux : admin1234 (hashé)
INSERT INTO users (id, first_name, last_name, email, password, is_admin)
VALUES 
    (
        '36c9050e-ddd3-4c3b-9731-9f487208bbc1',
        'Admin',
        'HBnB',
        'admin@hbnb.io',
        '$2b$12$7WmsbEqjsU.8pyXreNUX9OIyuWPpKQ.aLZ3jePAP7OAVI48MymCP2',
        TRUE
    ),
    (
        'f8bd510d-dd2b-4611-9510-9edb14838563',
        'Jean',
        'Voyageur',
        'jean@client.io',
        '$2b$12$7WmsbEqjsU.8pyXreNUX9OIyuWPpKQ.aLZ3jePAP7OAVI48MymCP2',
        FALSE
    );

-- 2. Équipements (Amenities)
INSERT INTO amenities (id, name) VALUES
    ('84e215b8-34ac-42ac-b7f1-9538622e17e7', 'WiFi'),
    ('5fb08c00-d262-4e9e-a047-a1669ac6aa46', 'Swimming Pool'),
    ('a0d743e7-1d5b-45c5-91f1-4711354ce6c7', 'Air Conditioning');

-- 3. Logement (Place : Villa Marbella)
INSERT INTO places (id, title, description, price, latitude, longitude, owner_id)
VALUES (
    'a2702a14-babf-420f-b202-5386632dd99e',
    'Villa Marbella',
    'Superbe villa avec vue imprenable et tout le confort moderne.',
    150.00,
    36.51,
    -4.88,
    '36c9050e-ddd3-4c3b-9731-9f487208bbc1' -- Appartient à l'Admin
);

-- 4. Liaisons (Place_Amenity)
INSERT INTO place_amenity (place_id, amenity_id) VALUES
    ('a2702a14-babf-420f-b202-5386632dd99e', '84e215b8-34ac-42ac-b7f1-9538622e17e7'), -- WiFi
    ('a2702a14-babf-420f-b202-5386632dd99e', '5fb08c00-d262-4e9e-a047-a1669ac6aa46'), -- Piscine
    ('a2702a14-babf-420f-b202-5386632dd99e', 'a0d743e7-1d5b-45c5-91f1-4711354ce6c7'); -- Clim