/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Flags } from '@oclif/core';
import { Messages, Org, ConfigAggregator, OrgConfigProperties } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/sf-plugins-core', 'messages');

async function maybeGetOrg(input: string): Promise<Org>;
async function maybeGetOrg(input: undefined): Promise<undefined>;
async function maybeGetOrg(input?: string | undefined): Promise<Org | undefined>;
async function maybeGetOrg(input?: string | undefined): Promise<Org | undefined> {
  try {
    return await Org.create({ aliasOrUsername: input });
  } catch (e) {
    if (!input) {
      return undefined;
    } else {
      throw e;
    }
  }
}

const maybeGetHub = async (input?: string): Promise<Org | undefined> => {
  const org = await maybeGetOrg(input ?? (await getDefaultHub(false)));
  if (org) {
    return ensureDevHub(org, input ?? org.getUsername());
  } else {
    return undefined;
  }
};

const getOrgOrThrow = async (input?: string): Promise<Org> => {
  const org = await maybeGetOrg(input);
  if (!org) {
    throw messages.createError('errors.NoDefaultEnv');
  }
  return org;
};

const ensureDevHub = async (org: Org, aliasOrUsername?: string): Promise<Org> => {
  if (await org.determineIfDevHubOrg()) {
    return org;
  }
  throw messages.createError('errors.NotADevHub', [aliasOrUsername ?? org.getUsername()]);
};

async function getDefaultHub(throwIfNotFound: false): Promise<string | undefined>;
async function getDefaultHub(throwIfNotFound: true): Promise<string>;
async function getDefaultHub(throwIfNotFound: boolean): Promise<string | undefined> {
  // check config for a default
  const config = await ConfigAggregator.create();
  const aliasOrUsername = config.getInfo(OrgConfigProperties.TARGET_DEV_HUB)?.value as string;
  if (throwIfNotFound && !aliasOrUsername) {
    throw messages.createError('errors.NoDefaultDevHub');
  }
  return aliasOrUsername;
}

const getHubOrThrow = async (aliasOrUsername?: string): Promise<Org> => {
  const resolved = aliasOrUsername ?? (await getDefaultHub(true));
  const org = await Org.create({ aliasOrUsername: resolved });
  return ensureDevHub(org, resolved);
};

/**
 * An optional org specified by username or alias
 * Will default to the default org if one is not specified.
 * Will not throw if the specified org and default do not exist
 *
 * @example
 *
 * ```
 * import { Flags } from '@salesforce/sf-plugins-core';
 * public static flags = {
 *     // setting length or prefix
 *    'target-org': Flags.optionalOrg(),
 *    // adding properties
 *    'flag2': Flags.optionalOrg({
 *        required: true,
 *        description: 'flag2 description',
 *     }),
 * }
 * ```
 */
export const optionalOrgFlag = Flags.custom({
  char: 'o',
  parse: async (input: string | undefined) => maybeGetOrg(input),
  default: async () => maybeGetOrg(),
  defaultHelp: async () => (await maybeGetOrg())?.getUsername(),
});

/**
 * A required org, specified by username or alias
 * Will throw if the specified org default do not exist
 * Will default to the default org if one is not specified.
 * Will throw if no default org exists and none is specified
 *
 * @example
 *
 * ```
 * import { Flags } from '@salesforce/sf-plugins-core';
 * public static flags = {
 *     // setting length or prefix
 *    'target-org': Flags.requiredOrg(),
 *    // adding properties
 *    'flag2': Flags.requiredOrg({
 *        required: true,
 *        description: 'flag2 description',
 *        char: 'o'
 *     }),
 * }
 * ```
 */
export const requiredOrgFlag = Flags.custom({
  char: 'o',
  summary: messages.getMessage('flags.targetOrg.summary'),
  parse: async (input: string | undefined) => getOrgOrThrow(input),
  default: async () => getOrgOrThrow(),
  defaultHelp: async () => (await getOrgOrThrow())?.getUsername(),
  required: true,
});

/**
 * A required org that is a devHub
 * Will throw if the specified org does not exist
 * Will default to the default dev hub if one is not specified
 * Will throw if no default deb hub exists and none is specified
 *
 * @example
 *
 * ```
 * import { Flags } from '@salesforce/sf-plugins-core';
 * public static flags = {
 *     // setting length or prefix
 *    'target-org': requiredHub(),
 *    // adding properties
 *    'flag2': requiredHub({
 *        required: true,
 *        description: 'flag2 description',
 *        char: 'h'
 *     }),
 * }
 * ```
 */
export const requiredHubFlag = Flags.custom({
  char: 'v',
  summary: messages.getMessage('flags.targetDevHubOrg.summary'),
  parse: async (input: string | undefined) => getHubOrThrow(input),
  default: async () => getHubOrThrow(),
  defaultHelp: async () => (await getHubOrThrow())?.getUsername(),
  required: true,
});

/**
 * An optional org that, if present, must be a devHub
 * Will throw if the specified org does not exist
 * Will default to the default dev hub if one is not specified
 * Will NOT throw if no default deb hub exists and none is specified
 *
 * @example
 *
 * ```
 * import { Flags } from '@salesforce/sf-plugins-core';
 * public static flags = {
 *     // setting length or prefix
 *    'target-org': optionalHubFlag(),
 *    // adding properties
 *    'flag2': optionalHubFlag({
 *        description: 'flag2 description',
 *        char: 'h'
 *     }),
 * }
 * ```
 */
export const optionalHubFlag = Flags.custom({
  char: 'v',
  summary: messages.getMessage('flags.targetDevHubOrg.summary'),
  parse: async (input: string | undefined) => maybeGetHub(input),
  default: async () => maybeGetHub(),
  defaultHelp: async () => (await maybeGetHub())?.getUsername(),
  required: false,
});
