-- Provenance only: public snapshot v1 never imports application or user data.
CREATE TABLE public_snapshot_imports (
 snapshot_id text PRIMARY KEY CHECK (snapshot_id ~ '^sha256:[0-9a-f]{64}$'),
 format text NOT NULL,
 format_version integer NOT NULL CHECK (format_version = 1),
 network_id text NOT NULL CHECK (network_id ~ '^[a-z0-9][a-z0-9._:-]{2,127}$'),
 checkpoint_height bigint NOT NULL CHECK (checkpoint_height >= 0),
 previous_snapshot_id text REFERENCES public_snapshot_imports(snapshot_id),
 release_root_sha256 text NOT NULL CHECK (release_root_sha256 ~ '^[0-9a-f]{64}$'),
 signer_key_id text NOT NULL CHECK (signer_key_id ~ '^sha256:[0-9a-f]{64}$'),
 manifest_json text NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(network_id,checkpoint_height),
 CHECK ((checkpoint_height=0 AND previous_snapshot_id IS NULL) OR (checkpoint_height>0 AND previous_snapshot_id IS NOT NULL))
);

CREATE TABLE public_snapshot_head (
 singleton smallint PRIMARY KEY DEFAULT 1 CHECK (singleton=1),
 snapshot_id text UNIQUE NOT NULL REFERENCES public_snapshot_imports(snapshot_id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
