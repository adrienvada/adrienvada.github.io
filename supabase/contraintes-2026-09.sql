-- ============================================================
--  GARDE-FOUS SUR LE CONTENU — à jouer UNE FOIS, septembre 2026
-- ============================================================
--  À coller dans l'éditeur SQL du projet Supabase « adrienvada-site »
--  (menu SQL Editor → New query → Run). Sans effet sur les dates déjà
--  saisies : elles respectent toutes ces règles (vérifié le 22/09/2026 —
--  24 soirées, liens tous en https ou vides). Si l'une d'elles ne les
--  respectait plus, Supabase refuserait l'ajout de la contrainte et
--  dirait laquelle : la corriger dans /admin/, puis relancer.
--
--  Pourquoi : voir la section « GARDE-FOUS SUR LE CONTENU » de
--  schema.sql, qui porte désormais les mêmes lignes.
-- ============================================================

alter table public.representations
  drop constraint if exists reservation_url_web,
  add constraint reservation_url_web
    check (reservation_url = '' or reservation_url ~* '^https?://[^[:space:]"''<>]+$'),
  drop constraint if exists textes_propres,
  add constraint textes_propres
    check (spectacle !~ '[[:cntrl:]  ]' and lieu !~ '[[:cntrl:]  ]'
           and ville !~ '[[:cntrl:]  ]' and heure !~ '[[:cntrl:]  ]'),
  drop constraint if exists longueurs_raisonnables,
  add constraint longueurs_raisonnables
    check (char_length(spectacle) <= 200 and char_length(lieu) <= 200
           and char_length(ville) <= 100 and char_length(heure) <= 40
           and char_length(reservation_url) <= 2000);

-- ------------------------------------------------------------
--  ET DANS LE TABLEAU DE BORD (Authentication → Sign In / Providers)
-- ------------------------------------------------------------
--  · « Allow new users to sign up » : DÉSACTIVÉ. Il n'y a qu'un compte,
--    celui d'Adrien ; personne n'a à en créer d'autre. La connexion
--    par mot de passe et par lien mail continue de fonctionner.
--  · « Confirm email » : ACTIVÉ. C'est lui qui garantit qu'une session
--    au nom d'adrien.vada@gmail.com appartient bien à la boîte mail.
