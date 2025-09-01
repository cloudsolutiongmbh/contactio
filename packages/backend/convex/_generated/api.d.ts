/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as companies from "../companies.js";
import type * as contacts from "../contacts.js";
import type * as graph from "../graph.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as policies from "../policies.js";
import type * as privateData from "../privateData.js";
import type * as settings from "../settings.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tenants from "../tenants.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  companies: typeof companies;
  contacts: typeof contacts;
  graph: typeof graph;
  healthCheck: typeof healthCheck;
  http: typeof http;
  migrations: typeof migrations;
  policies: typeof policies;
  privateData: typeof privateData;
  settings: typeof settings;
  subscriptions: typeof subscriptions;
  tenants: typeof tenants;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
