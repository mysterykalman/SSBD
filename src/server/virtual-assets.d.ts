// Static files embedded into the worker by scripts/build.mjs.
declare module "virtual:assets" {
  export const assets: Record<string, {body: string; type: string; cache: string; etag: string}>;
}
