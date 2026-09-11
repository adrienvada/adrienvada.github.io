-- ============================================================
--  IMPORT INITIAL — les dates à venir de dates.js au 11 sept. 2026
-- ============================================================
--  Joué une fois après schema.sql. À partir de là, la table fait foi
--  et dates.js est régénéré par build/exporter-dates.js.
-- ============================================================

insert into public.representations
  (spectacle, lieu, ville, jour, heure, reservation_url, scolaire)
values
  ('À la barre, peine perdue ?', 'Tribunal judiciaire de Rouen (76)', 'Rouen', '2026-10-22', '19h00', '', false),
  ('À la barre, peine perdue ?', 'Tribunal judiciaire de Rouen (76)', 'Rouen', '2026-10-23', '19h00', '', false),
  ('À la barre, peine perdue ?', 'Tribunal judiciaire de Saint-Quentin (02)', 'Saint-Quentin', '2026-11-12', '14h15', '', false),
  ('À la barre, peine perdue ?', 'Tribunal judiciaire de Saint-Quentin (02)', 'Saint-Quentin', '2026-11-12', '20h00', '', false),
  ('À la barre, peine perdue ?', 'Hôtel de Ville de Grand-Quevilly (76)', 'Grand-Quevilly', '2026-11-25', '', '', false),
  ('Cléophène, d’après Rodogune', 'L’Éclat, Pont-Audemer (27)', 'Pont-Audemer', '2026-12-18', '', '', false),
  ('Cléophène, d’après Rodogune', 'Le Forum, Falaise (14)', 'Falaise', '2027-01-26', '', '', false),
  ('Bérénice', 'Théâtre de la ville de Saint-Lô (50)', 'Saint-Lô', '2027-01-29', '', '', false),
  ('Bérénice', 'Théâtre de la ville de Saint-Lô (50)', 'Saint-Lô', '2027-01-30', '', '', false),
  ('Cléophène, d’après Rodogune', 'Théâtre de la ville de Saint-Lô (50)', 'Saint-Lô', '2027-01-29', '', '', false),
  ('Cléophène, d’après Rodogune', 'Théâtre de la ville de Saint-Lô (50)', 'Saint-Lô', '2027-01-30', '', '', false),
  ('Cléophène, d’après Rodogune', 'La Ferme de Bel Ebat, Guyancourt (78)', 'Guyancourt', '2027-02-02', '', '', false),
  ('À la barre, peine perdue ?', 'Hôtel de ville de Barentin (76)', 'Barentin', '2027-03-12', '', '', false),
  ('Bérénice', 'Lycée Corneille, Rouen (76)', 'Rouen', '2027-05-18', '', '', true),
  ('Bérénice', 'Lycée Corneille, Rouen (76)', 'Rouen', '2027-05-19', '', '', true),
  ('Bérénice', 'Lycée Corneille, Rouen (76)', 'Rouen', '2027-05-20', '', '', true),
  ('Bérénice', 'Lycée Corneille, Rouen (76)', 'Rouen', '2027-05-21', '', '', false)
on conflict do nothing;
