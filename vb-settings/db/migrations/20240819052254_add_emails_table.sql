-- migrate:up
CREATE TABLE IF NOT EXISTS "emails" (
  board_id VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  connected BOOLEAN NOT NULL,
  FOREIGN KEY(board_id) REFERENCES local_boards(name) ON DELETE CASCADE,
  UNIQUE(board_id, email)
);

-- migrate:down
DROP TABLE IF EXISTS "emails";
