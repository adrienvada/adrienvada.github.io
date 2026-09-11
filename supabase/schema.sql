-- ============================================================
--  DATES DE SPECTACLE — schéma Supabase
-- ============================================================
--  Ce fichier décrit la table qui remplace la partie « à venir »
--  de dates.js. Il a été joué une fois dans l'éditeur SQL du projet
--  Supabase « adrienvada-site » ; il est conservé ici pour mémoire,
--  et pour pouvoir recréer la table à l'identique si le projet
--  devait être refait.
--
--  UNE LIGNE = UNE SOIRÉE. Deux représentations le même jour à des
--  heures différentes font deux lignes. Le site regroupe lui-même
--  les lignes d'un même spectacle au même lieu en « série » : il
--  n'y a donc rien à saisir pour ça (voir dates-live.js).
--
--  LES ARCHIVES NE SONT PAS ICI. Les saisons passées restent dans
--  dates.js, à la main, comme avant : elles ne changent plus.
-- ============================================================

create table if not exists public.representations (
  id               bigint generated always as identity primary key,

  -- Le titre tel qu'il apparaît sur le site ET dans le CV (index.html) :
  -- c'est la clé qui relie une date à sa ligne du CV et à sa page
  -- spectacle. « Cléophène, d’après Rodogune », pas « Cléophène ».
  spectacle        text not null,

  -- Le lieu tel qu'on l'affiche : « Le Forum, Falaise (14) ».
  lieu             text not null,

  -- La ville seule, sans département : alimente les filtres de
  -- recherche. « Falaise ».
  ville            text not null,

  -- Le jour, au format date. L'affichage en français est calculé.
  jour             date not null,

  -- « 19h00 », ou vide si l'horaire n'est pas encore connu.
  heure            text not null default '',

  -- Lien de billetterie. Vide = « Les réservations ne sont pas encore ouvertes ».
  reservation_url  text not null default '',

  -- Séance scolaire : pas de réservation publique, mention spéciale.
  scolaire         boolean not null default false,

  cree_le          timestamptz not null default now(),
  modifie_le       timestamptz not null default now()
);

-- Une soirée ne peut pas être saisie deux fois.
create unique index if not exists representations_unicite
  on public.representations (spectacle, lieu, jour, heure);

-- Le site lit toujours « par date » : l'index évite un tri à chaque visite.
create index if not exists representations_par_jour
  on public.representations (jour);

-- `modifie_le` se met à jour tout seul.
create or replace function public.toucher_modifie_le()
returns trigger language plpgsql as $$
begin
  new.modifie_le = now();
  return new;
end $$;

drop trigger if exists representations_modifie_le on public.representations;
create trigger representations_modifie_le
  before update on public.representations
  for each row execute function public.toucher_modifie_le();

-- ------------------------------------------------------------
--  RÈGLES D'ACCÈS (Row Level Security)
-- ------------------------------------------------------------
--  Tout le monde lit ; seul Adrien écrit. La clé « publishable »
--  embarquée dans le site ne donne que les droits ci-dessous —
--  c'est pour ça qu'elle peut être publique.
-- ------------------------------------------------------------

alter table public.representations enable row level security;

drop policy if exists "lecture publique" on public.representations;
create policy "lecture publique"
  on public.representations
  for select
  to anon, authenticated
  using (true);

drop policy if exists "écriture réservée à Adrien" on public.representations;
create policy "écriture réservée à Adrien"
  on public.representations
  for all
  to authenticated
  using      ((select auth.jwt() ->> 'email') = 'adrien.vada@gmail.com')
  with check ((select auth.jwt() ->> 'email') = 'adrien.vada@gmail.com');
