import { resolve as tsResolve, load as tsLoad } from 'ts-node/esm';
import { createMatchPath, loadConfig } from 'tsconfig-paths';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Calls console.log with all the arguments only if the environment variable NODE_DEBUG contains the string 'ts-loader'.
function log(...args) {
  if (process.env.NODE_DEBUG && (process.env.NODE_DEBUG.includes('ts-loader') || process.env.NODE_DEBUG === '*')) {
    console.log(...args);
  }
}

let matchPath = null;

function checkMatchPath(cwdUrl) {
  // If was already parsed, use it
  if (matchPath) return matchPath;
  // If to TS_NODE_PROJECT is set, use it
  if (process.env.TS_NODE_PROJECT) {
    log("using TS_NODE_PROJECT", process.env.TS_NODE_PROJECT);
    cwdUrl = process.env.TS_NODE_PROJECT;
    // Do not reuse it again
    process.env.TS_NODE_PROJECT = '';
  }
  // If no file url found yet, return a no-op
  if (!cwdUrl) return () => null;
  try {
    // Convert the url to a folder
    let path = fileURLToPath(cwdUrl);
    path = dirname(path);
    // Try to load from that folder
    const { absoluteBaseUrl, paths, configFileAbsolutePath } = loadConfig(path);
    if (!paths) {
      return () => null;
    }
    log("found tsconfig.json", configFileAbsolutePath, paths);
    matchPath = createMatchPath(absoluteBaseUrl, paths);
    return matchPath;
  } catch (e) {
    log("error loading tsconfig.json", e);
    return () => null;
  }
}

// Check if the spec ends with a valid extension
function hasExt(spec) {
  return spec.endsWith(".ts") ||
         spec.endsWith(".js") ||
         spec.endsWith(".tsx") ||
         spec.endsWith(".jsx");
}


export async function resolve (spec, ctx, next) {
  log("resolve", spec, ctx);
  // Try to use the parentUrl or the actual file url to find a tsconfig.json file
  let url = ctx.parentURL;
  if (!url && spec.startsWith("file:")) {
    url = spec;
  }
  // Convert it to a mapped file based on tsconfig paths
  const mapped = checkMatchPath(url)(spec) ?? spec;

  // Files already ending with a valid extension or modules starting with node: are not probed
  if (!hasExt(mapped) && mapped.indexOf("node:") !== 0) {
    // All other values are probed looking for .ts, .js, .tsx or .jsx and their indexes
    const variants = [
      `${mapped}.ts`, `${mapped}.js`, `${mapped}.tsx`,
      `${mapped}/index.ts`, `${mapped}/index.js`,
      `${mapped}/index.tsx`, `${mapped}/index.jsx`,
    ];
    for (const v of variants) {
      try {
        const ret = await tsResolve(v, ctx, next);
        log("resolved", spec, v, ret);
        return ret;
      } catch (e) {
        log("resolve error", spec, v, e + '');
      }
    }
  }
  // Just proceed with the raw value
  try {
    const ret = await tsResolve(mapped, ctx, next);
    log("ts resolved", spec, mapped, ret);
    return ret;
  } catch (e) {
    log("ts resolve error", e);
    // Repackage the error, otherwise it may not be serialized nor displayed correctly to the user
    throw new Error(`Cannot resolve ${spec}: ${e}`);
  }
}

export async function load (url, ctx, next) {
  try {
    const ret = await tsLoad(url, ctx, next);
    log("ts loaded", url, ret);
    return ret;
  } catch (e) {
    log("ts load error", e);
    // Repackage the error, otherwise it may not be serialized nor displayed correctly to the user
    throw new Error(`Cannot load ${url}: ${e}`);
  }
}
