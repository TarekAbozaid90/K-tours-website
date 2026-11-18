-- K-tours: Supabase schema
-- Run this whole file in Supabase > SQL Editor > New query.
-- Admin email below must match config.js ADMIN_EMAIL.

create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  country text not null default '' check (char_length(country) <= 80),
  rating integer not null check (rating between 1 and 5),
  message text not null check (char_length(message) between 1 and 1200),
  photo_urls text[] not null default '{}',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  category text not null default 'Guest moments',
  image_url text not null,
  storage_path text not null,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists reviews_public_created_idx on public.reviews (approved, created_at desc);
create index if not exists gallery_public_order_idx on public.gallery (visible, sort_order, created_at desc);

alter table public.reviews enable row level security;
alter table public.gallery enable row level security;

grant select, insert, update, delete on public.reviews to anon, authenticated;
grant select, insert, update, delete on public.gallery to anon, authenticated;

-- Public visitors can only read approved reviews and visible gallery photographs.
drop policy if exists "Public can read approved reviews" on public.reviews;
create policy "Public can read approved reviews"
on public.reviews for select to anon, authenticated
using (approved = true);

drop policy if exists "Guests can submit reviews for moderation" on public.reviews;
create policy "Guests can submit reviews for moderation"
on public.reviews for insert to anon, authenticated
with check (approved = false);

-- The configured administrator can read, approve and remove any review.
drop policy if exists "K-tours admin can read all reviews" on public.reviews;
create policy "K-tours admin can read all reviews"
on public.reviews for select to authenticated
using ((auth.jwt() ->> 'email') = 'mkataif@gmail.com');

drop policy if exists "K-tours admin can update reviews" on public.reviews;
create policy "K-tours admin can update reviews"
on public.reviews for update to authenticated
using ((auth.jwt() ->> 'email') = 'mkataif@gmail.com')
with check ((auth.jwt() ->> 'email') = 'mkataif@gmail.com');

drop policy if exists "K-tours admin can delete reviews" on public.reviews;
create policy "K-tours admin can delete reviews"
on public.reviews for delete to authenticated
using ((auth.jwt() ->> 'email') = 'mkataif@gmail.com');

-- Gallery: public can view visible items; only the configured admin can manage them.
drop policy if exists "Public can read visible gallery" on public.gallery;
create policy "Public can read visible gallery"
on public.gallery for select to anon, authenticated
using (visible = true);

drop policy if exists "K-tours admin can read all gallery items" on public.gallery;
create policy "K-tours admin can read all gallery items"
on public.gallery for select to authenticated
using ((auth.jwt() ->> 'email') = 'mkataif@gmail.com');

drop policy if exists "K-tours admin can insert gallery items" on public.gallery;
create policy "K-tours admin can insert gallery items"
on public.gallery for insert to authenticated
with check ((auth.jwt() ->> 'email') = 'mkataif@gmail.com');

drop policy if exists "K-tours admin can update gallery items" on public.gallery;
create policy "K-tours admin can update gallery items"
on public.gallery for update to authenticated
using ((auth.jwt() ->> 'email') = 'mkataif@gmail.com')
with check ((auth.jwt() ->> 'email') = 'mkataif@gmail.com');

drop policy if exists "K-tours admin can delete gallery items" on public.gallery;
create policy "K-tours admin can delete gallery items"
on public.gallery for delete to authenticated
using ((auth.jwt() ->> 'email') = 'mkataif@gmail.com');

-- Public image buckets. The storage-level limits are set on bucket creation.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tour-reviews', 'tour-reviews', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('gallery', 'gallery', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Photos attached to guest reviews can be uploaded by visitors and are public only
-- when the corresponding review is approved and its URL is displayed on the site.
drop policy if exists "Public can view K-tours images" on storage.objects;
create policy "Public can view K-tours images"
on storage.objects for select to anon, authenticated
using (bucket_id in ('tour-reviews', 'gallery'));

drop policy if exists "Guests can upload review photos" on storage.objects;
create policy "Guests can upload review photos"
on storage.objects for insert to anon, authenticated
with check (bucket_id = 'tour-reviews');

-- Gallery uploads/deletes are restricted to the configured admin email.
drop policy if exists "K-tours admin can upload gallery photos" on storage.objects;
create policy "K-tours admin can upload gallery photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'gallery' and (auth.jwt() ->> 'email') = 'mkataif@gmail.com');

drop policy if exists "K-tours admin can update gallery photos" on storage.objects;
create policy "K-tours admin can update gallery photos"
on storage.objects for update to authenticated
using (bucket_id = 'gallery' and (auth.jwt() ->> 'email') = 'mkataif@gmail.com')
with check (bucket_id = 'gallery' and (auth.jwt() ->> 'email') = 'mkataif@gmail.com');

drop policy if exists "K-tours admin can delete gallery photos" on storage.objects;
create policy "K-tours admin can delete gallery photos"
on storage.objects for delete to authenticated
using (bucket_id = 'gallery' and (auth.jwt() ->> 'email') = 'mkataif@gmail.com');
