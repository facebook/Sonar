/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import path from 'path';
import fs from 'fs-extra';
import Metro from 'metro';
import util from 'util';
import recursiveReaddir from 'recursive-readdir';
import expandTilde from 'expand-tilde';
import pMap from 'p-map';
import {homedir} from 'os';
import Watchman from './watchman';
import getWatchFolders from './get-watch-folders';

const HOME_DIR = homedir();

let metroDir: string | undefined;
const metroDirPromise = getMetroDir().then((dir) => (metroDir = dir));

const DEFAULT_COMPILE_OPTIONS: CompileOptions = {
  force: false,
  failSilently: true,
  recompileOnChanges: true,
};

export type CompileOptions = {
  force: boolean;
  failSilently: boolean;
  recompileOnChanges: boolean;
};

export type PluginManifest = {
  version: string;
  name: string;
  main?: string;
  bundleMain?: string;
  [key: string]: any;
};

type PluginInfo = {
  rootDir: string;
  name: string;
  entry: string;
  manifest: PluginManifest;
};

export type CompiledPluginInfo = PluginManifest & {out: string};

export default async function (
  reloadCallback: (() => void) | null,
  pluginPaths: string[],
  pluginCache: string,
  options: CompileOptions = DEFAULT_COMPILE_OPTIONS,
) {
  options = Object.assign({}, DEFAULT_COMPILE_OPTIONS, options);
  const plugins = pluginEntryPoints(pluginPaths);
  if (!(await fs.pathExists(pluginCache))) {
    await fs.mkdir(pluginCache);
  }
  if (options.recompileOnChanges) {
    await startWatchChanges(plugins, reloadCallback, pluginCache, options);
  }
  const compilations = pMap(
    Object.values(plugins),
    (plugin) => {
      return compilePlugin(plugin, pluginCache, options);
    },
    {concurrency: 4},
  );

  const dynamicPlugins = (await compilations).filter(
    (c) => c !== null,
  ) as CompiledPluginInfo[];
  console.log('✅  Compiled all plugins.');
  return dynamicPlugins;
}

async function startWatchingPluginsUsingWatchman(
  plugins: PluginInfo[],
  onPluginChanged: (plugin: PluginInfo) => void,
) {
  // Initializing a watchman for each folder containing plugins
  const watchmanRootMap: {[key: string]: Watchman} = {};
  await Promise.all(
    plugins.map(async (plugin) => {
      const watchmanRoot = path.resolve(plugin.rootDir, '..');
      if (!watchmanRootMap[watchmanRoot]) {
        watchmanRootMap[watchmanRoot] = new Watchman(watchmanRoot);
        await watchmanRootMap[watchmanRoot].initialize();
      }
    }),
  );
  // Start watching plugins using the initialized watchmans
  await Promise.all(
    plugins.map(async (plugin) => {
      const watchmanRoot = path.resolve(plugin.rootDir, '..');
      const watchman = watchmanRootMap[watchmanRoot];
      await watchman.startWatchFiles(
        path.relative(watchmanRoot, plugin.rootDir),
        () => onPluginChanged(plugin),
        {
          excludes: ['**/__tests__/**/*', '**/node_modules/**/*', '**/.*'],
        },
      );
    }),
  );
}

async function startWatchChanges(
  plugins: {[key: string]: PluginInfo},
  reloadCallback: (() => void) | null,
  pluginCache: string,
  options: CompileOptions = DEFAULT_COMPILE_OPTIONS,
) {
  // eslint-disable-next-line no-console
  console.log('🕵️‍  Watching for plugin changes');

  const delayedCompilation: {[key: string]: NodeJS.Timeout | null} = {};
  const kCompilationDelayMillis = 1000;
  const onPluginChanged = (plugin: PluginInfo) => {
    if (!delayedCompilation[plugin.name]) {
      delayedCompilation[plugin.name] = setTimeout(() => {
        delayedCompilation[plugin.name] = null;
        // eslint-disable-next-line no-console
        console.log(`🕵️‍  Detected changes in ${plugin.name}`);
        const watchOptions = Object.assign(options, {force: true});
        compilePlugin(plugin, pluginCache, watchOptions).then(
          reloadCallback ?? (() => {}),
        );
      }, kCompilationDelayMillis);
    }
  };
  const filteredPlugins = Object.values(plugins)
    // no hot reloading for plugins in .flipper folder. This is to prevent
    // Flipper from reloading, while we are doing changes on thirdparty plugins.
    .filter(
      (plugin) => !plugin.rootDir.startsWith(path.join(HOME_DIR, '.flipper')),
    );
  try {
    await startWatchingPluginsUsingWatchman(filteredPlugins, onPluginChanged);
  } catch (err) {
    console.error(
      'Failed to start watching plugin files using Watchman, continue without hot reloading',
      err,
    );
  }
}
function hash(string: string) {
  let hash = 0;
  if (string.length === 0) {
    return hash;
  }
  let chr;
  for (let i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}
const fileToIdMap = new Map();
const createModuleIdFactory = () => (filePath: string) => {
  if (filePath === '__prelude__') {
    return 0;
  }
  let id = fileToIdMap.get(filePath);
  if (typeof id !== 'number') {
    id = hash(filePath);
    fileToIdMap.set(filePath, id);
  }
  return id;
};
function pluginEntryPoints(additionalPaths: string[] = []) {
  const defaultPluginPath = path.join(HOME_DIR, '.flipper', 'node_modules');
  const entryPoints = entryPointForPluginFolder(defaultPluginPath);
  if (typeof additionalPaths === 'string') {
    additionalPaths = [additionalPaths];
  }
  additionalPaths.forEach((additionalPath) => {
    const additionalPlugins = entryPointForPluginFolder(additionalPath);
    Object.keys(additionalPlugins).forEach((key) => {
      entryPoints[key] = additionalPlugins[key];
    });
  });
  return entryPoints;
}
function entryPointForPluginFolder(pluginPath: string) {
  pluginPath = expandTilde(pluginPath);
  if (!fs.existsSync(pluginPath)) {
    return {};
  }
  return fs
    .readdirSync(pluginPath)
    .filter((name) => fs.lstatSync(path.join(pluginPath, name)).isDirectory())
    .filter(Boolean)
    .map((name) => {
      let packageJSON;
      try {
        packageJSON = fs
          .readFileSync(path.join(pluginPath, name, 'package.json'))
          .toString();
      } catch (e) {}
      if (packageJSON) {
        try {
          const json = JSON.parse(packageJSON);
          if (!json.keywords || !json.keywords.includes('flipper-plugin')) {
            console.log(
              `Skipping package "${json.name}", because its "keywords" field does not contain tag "flipper-plugin"`,
            );
            return null;
          }
          const pkg = json as PluginManifest;
          const plugin: PluginInfo = {
            manifest: pkg,
            name: pkg.name,
            entry: path.join(pluginPath, name, pkg.main || 'index.js'),
            rootDir: path.join(pluginPath, name),
          };
          return plugin;
        } catch (e) {
          console.error(
            `Could not load plugin "${pluginPath}", because package.json is invalid.`,
          );
          console.error(e);
          return null;
        }
      }
      return null;
    })
    .filter(Boolean)
    .reduce<{[key: string]: PluginInfo}>((acc, cv) => {
      acc[cv!.name] = cv!;
      return acc;
    }, {});
}
async function mostRecentlyChanged(dir: string) {
  const files = await util.promisify<string, string[]>(recursiveReaddir)(dir);
  return files
    .map((f) => fs.lstatSync(f).ctime)
    .reduce((a, b) => (a > b ? a : b), new Date(0));
}
async function getMetroDir() {
  let dir = __dirname;
  while (true) {
    const dirToCheck = path.join(dir, 'node_modules', 'metro');
    if (await fs.pathExists(dirToCheck)) return dirToCheck;
    const nextDir = path.dirname(dir);
    if (!nextDir || nextDir === '' || nextDir === dir) {
      break;
    }
    dir = nextDir;
  }
  return __dirname;
}
async function compilePlugin(
  pluginInfo: PluginInfo,
  pluginCache: string,
  {force, failSilently}: CompileOptions,
): Promise<CompiledPluginInfo | null> {
  const {rootDir, manifest, entry, name} = pluginInfo;
  const bundleMain = manifest.bundleMain ?? path.join('dist', 'index.js');
  const bundlePath = path.join(rootDir, bundleMain);
  const dev = process.env.NODE_ENV !== 'production';
  if (await fs.pathExists(bundlePath)) {
    // eslint-disable-next-line no-console
    const out = path.join(rootDir, bundleMain);
    console.log(`🥫  Using pre-built version of ${name}: ${out}...`);
    return Object.assign({}, pluginInfo.manifest, {out});
  } else {
    const out = path.join(
      pluginCache,
      `${name}@${manifest.version || '0.0.0'}.js`,
    );
    const result = Object.assign({}, pluginInfo.manifest, {out});
    const rootDirCtime = await mostRecentlyChanged(rootDir);
    if (
      !force &&
      (await fs.pathExists(out)) &&
      rootDirCtime < (await fs.lstat(out)).ctime
    ) {
      // eslint-disable-next-line no-console
      console.log(`🥫  Using cached version of ${name}...`);
      return result;
    } else {
      // eslint-disable-line no-console
      console.log(`⚙️  Compiling ${name}...`);
      try {
        await Metro.runBuild(
          {
            reporter: {update: () => {}},
            projectRoot: rootDir,
            watchFolders: [metroDir || (await metroDirPromise)].concat(
              await getWatchFolders(rootDir),
            ),
            serializer: {
              getRunModuleStatement: (moduleID: string) =>
                `module.exports = global.__r(${moduleID}).default;`,
              createModuleIdFactory,
            },
            transformer: {
              babelTransformerPath: global.electronResolve
                ? global.electronResolve('flipper-babel-transformer') // when compilation is executing in Electron main process
                : require.resolve('flipper-babel-transformer'), // when compilation is is executing in Node.js script
            },
            resolver: {
              sourceExts: ['tsx', 'ts', 'js'],
              blacklistRE: /\.native\.js$/,
            },
          },
          {
            entry: entry.replace(rootDir, '.'),
            out,
            dev,
            sourceMap: true,
            minify: false,
            resetCache: !dev,
          },
        );
      } catch (e) {
        if (failSilently) {
          console.error(
            `❌  Plugin ${name} is ignored, because it could not be compiled.`,
          );
          console.error(e);
          return null;
        } else {
          throw e;
        }
      }
      return result;
    }
  }
}
