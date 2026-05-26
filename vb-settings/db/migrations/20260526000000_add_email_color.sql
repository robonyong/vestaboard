-- migrate:up
ALTER TABLE "emails" ADD COLUMN color VARCHAR NOT NULL DEFAULT "WHITE";

-- migrate:down
ALTER TABLE "emails" DROP COLUMN color;
