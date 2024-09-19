PRAGMA foreign_keys=on;
CREATE TABLE IF NOT EXISTS "local_boards" (
   name VARCHAR PRIMARY KEY NOT NULL,
   transit_enabled BOOLEAN NOT NULL,
   calendar_enabled BOOLEAN NOT NULL,
   transit_start VARCHAR NOT NULL,
   transit_end VARCHAR NOT NULL
, transit_days VARCHAR NOT NULL DEFAULT "", calendar_days VARCHAR NOT NULL DEFAULT "");
CREATE TABLE IF NOT EXISTS "schema_migrations" (version varchar(128) primary key);
CREATE TABLE IF NOT EXISTS "emails" (
  board_id VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  connected BOOLEAN NOT NULL,
  FOREIGN KEY(board_id) REFERENCES local_boards(name) ON DELETE CASCADE,
  UNIQUE(board_id, email)
);
-- Dbmate schema migrations
INSERT INTO "schema_migrations" (version) VALUES
  ('20240819052254');
