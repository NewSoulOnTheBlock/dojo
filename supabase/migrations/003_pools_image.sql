-- Add image URL to pools table
alter table pools add column if not exists image_url text default '';
