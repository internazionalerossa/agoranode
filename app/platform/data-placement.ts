/**
 * Normative classification for future replication protocols. This module is
 * deliberately independent of database/API code. A policy declaration is
 * NOT a security boundary until exporters and receivers enforce it.
 */
export const DATA_CLASSES = [
  'public-verified',
  'public-ephemeral',
  'private-local',
  'private-authorized',
  'secret-never-export',
] as const;

export type DataClass = (typeof DATA_CLASSES)[number];

export type DataPlacement = {
  dataClass: DataClass;
  publicPeerReplication: boolean;
  durableByDefault: boolean;
  requireUserOrCustodianAuthorization: boolean;
};

export const DATA_PLACEMENT: Readonly<Record<DataClass, DataPlacement>> = {
  'public-verified': {
    dataClass: 'public-verified',
    publicPeerReplication: true,
    durableByDefault: true,
    requireUserOrCustodianAuthorization: false,
  },
  'public-ephemeral': {
    dataClass: 'public-ephemeral',
    publicPeerReplication: false,
    durableByDefault: false,
    requireUserOrCustodianAuthorization: false,
  },
  'private-local': {
    dataClass: 'private-local',
    publicPeerReplication: false,
    durableByDefault: true,
    requireUserOrCustodianAuthorization: true,
  },
  'private-authorized': {
    dataClass: 'private-authorized',
    publicPeerReplication: false,
    durableByDefault: true,
    requireUserOrCustodianAuthorization: true,
  },
  'secret-never-export': {
    dataClass: 'secret-never-export',
    publicPeerReplication: false,
    durableByDefault: false,
    requireUserOrCustodianAuthorization: true,
  },
} as const;

/** Fail closed for unknown classes; never infer replication rights from a "public" field. */
export function isPublicPeerReplicable(dataClass: unknown): dataClass is 'public-verified' {
  return dataClass === 'public-verified';
}
