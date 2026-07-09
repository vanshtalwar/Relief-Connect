ALTER TABLE "HelpRequest" DROP COLUMN IF EXISTS "location";
ALTER TABLE "HelpRequest" ADD COLUMN "location" geography GENERATED ALWAYS AS (st_setsrid(st_makepoint(longitude, latitude), 4326)::geography) STORED;
CREATE INDEX IF NOT EXISTS idx_helprequest_location ON "HelpRequest" USING Gist (location);
