/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

const path = require('path');
const fs = require('fs');
const Metro = require('metro');
const util = require('util');
const recursiveReaddir = require('recursive-readdir');
const expandTilde = require('expand-tilde');
const pMap = require('p-map');
const HOME_DIR = require('os').homedir();
const Watchman = require('./watchman');

const DEFAULT_COMPILE_OPTIONS = {
  force: false,
  failSilently: true,
  recompileOnChanges: true,
};

module.exports = async (
  reloadCallback,
  pluginPaths,
  pluginCache,
  options = DEFAULT_COMPILE_OPTIONS,
) => {
  options = Object.assign({}, DEFAULT_COMPILE_OPTIONS, options);
  const plugins = pluginEntryPoints(pluginPaths);
  if (!fs.existsSync(pluginCache)) {
    fs.mkdirSync(pluginCache);
  }
  if (options.recompileOnChanges) {
    await startWatchChanges(plugins, reloadCallback, pluginCache, options);
  }
  const compilations = pMap(
    Object.values(plugins),
    plugin => {
      const dynamicOptions = Object.assign(options, {force: false});
      return compilePlugin(plugin, pluginCache, dynamicOptions);
    },
    {concurrency: 4},
  );

  const dynamicPlugins = (await compilations).filter(c => c != null);
  console.log('✅  Compiled all plugins.');
  return dynamicPlugins;
};

async function startWatchingPluginsUsingWatchman(plugins, onPluginChanged) {
  // Initializing a watchman for each folder containing plugins
  const watchmanRootMap = {};
  await Promise.all(
    plugins.map(async plugin => {
      const watchmanRoot = path.resolve(plugin.rootDir, '..');
      if (!watchmanRootMap[watchmanRoot]) {
        watchmanRootMap[watchmanRoot] = new Watchman(watchmanRoot);
        await watchmanRootMap[watchmanRoot].initialize();
      }
    }),
  );
  // Start watching plugins using the initialized watchmans
  await Promise.all(
    plugins.map(async plugin => {
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
  plugins,
  reloadCallback,
  pluginCache,
  options = DEFAULT_COMPILE_OPTIONS,
) {
  // eslint-disable-next-line no-console
  console.log('🕵️‍  Watching for plugin changes');

  const delayedCompilation = {};
  const kCompilationDelayMillis = 1000;
  const onPluginChanged = plugin => {
    if (!delayedCompilation[plugin.name]) {
      delayedCompilation[plugin.name] = setTimeout(() => {
        delayedCompilation[plugin.name] = null;
        // eslint-disable-next-line no-console
        console.log(`🕵️‍  Detected changes in ${plugin.name}`);
        const watchOptions = Object.assign(options, {force: true});
        compilePlugin(plugin, pluginCache, watchOptions).then(reloadCallback);
      }, kCompilationDelayMillis);
    }
  };
  const filteredPlugins = Object.values(plugins)
    // no hot reloading for plugins in .flipper folder. This is to prevent
    // Flipper from reloading, while we are doing changes on thirdparty plugins.
    .filter(
      plugin => !plugin.rootDir.startsWith(path.join(HOME_DIR, '.flipper')),
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
function hash(string) {
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
const createModuleIdFactory = () => filePath => {
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
function pluginEntryPoints(additionalPaths = []) {
  const defaultPluginPath = path.join(HOME_DIR, '.flipper', 'node_modules');
  const entryPoints = entryPointForPluginFolder(defaultPluginPath);
  if (typeof additionalPaths === 'string') {
    additionalPaths = [additionalPaths];
  }
  additionalPaths.forEach(additionalPath => {
    const additionalPlugins = entryPointForPluginFolder(additionalPath);
    Object.keys(additionalPlugins).forEach(key => {
      entryPoints[key] = additionalPlugins[key];
    });
  });
  return entryPoints;
}
function entryPointForPluginFolder(pluginPath) {
  pluginPath = expandTilde(pluginPath);
  if (!fs.existsSync(pluginPath)) {
    return {};
  }
  return fs
    .readdirSync(pluginPath)
    .filter(name => fs.lstatSync(path.join(pluginPath, name)).isDirectory())
    .filter(Boolean)
    .map(name => {
      let packageJSON;
      try {
        packageJSON = fs
          .readFileSync(path.join(pluginPath, name, 'package.json'))
          .toString();
      } catch (e) {}
      if (packageJSON) {
        try {
          const pkg = JSON.parse(packageJSON);
          return {
            packageJSON: pkg,
            name: pkg.name,
            entry: path.join(pluginPath, name, pkg.main || 'index.js'),
            rootDir: path.join(pluginPath, name),
          };
        } catch (e) {
          console.error(
            `Could not load plugin "${pluginPath}", because package.json is invalid.`,
          );
          console.error(e);
          return null;
        }
      }
    })
    .filter(Boolean)
    .reduce((acc, cv) => {
      acc[cv.name] = cv;
      return acc;
    }, {});
}
function mostRecentlyChanged(dir) {
  return util
    .promisify(recursiveReaddir)(dir)
    .then(files =>
      files
        .map(f => fs.lstatSync(f).ctime)
        .reduce((a, b) => (a > b ? a : b), new Date(0)),
    );
}
async function compilePlugin(
  {rootDir, name, entry, packageJSON},
  pluginCache,
  options,
) {
  const fileName = `${name}@${packageJSON.version || '0.0.0'}.js`;
  const out = path.join(pluginCache, fileName);
  const result = Object.assign({}, packageJSON, {rootDir, name, entry, out});
  // check if plugin needs to be compiled
  const rootDirCtime = await mostRecentlyChanged(rootDir);
  if (
    !options.force &&
    fs.existsSync(out) &&
    rootDirCtime < fs.lstatSync(out).ctime
  ) {
    // eslint-disable-next-line no-console
    console.log(`🥫  Using cached version of ${name}...`);
    return result;
  } else {
    console.log(`⚙️  Compiling ${name}...`); // eslint-disable-line no-console
    try {
      await Metro.runBuild(
        {
          reporter: {update: () => {}},
          projectRoot: rootDir,
          watchFolders: [__dirname, rootDir],
          serializer: {
            getRunModuleStatement: moduleID =>
              `module.exports = global.__r(${moduleID}).default;`,
            createModuleIdFactory,
          },
          transformer: {
            babelTransformerPath: path.join(
              __dirname,
              'transforms',
              'index.js',
            ),
          },
          resolver: {
            sourceExts: ['tsx', 'ts', 'js'],
            blacklistRE: /(\/|\\)(sonar|flipper|flipper-public)(\/|\\)(dist|doctor)(\/|\\)|(\.native\.js$)/,
          },
        },
        {
          entry: entry.replace(rootDir, '.'),
          out,
          dev: false,
          sourceMap: true,
          minify: false,
        },
      );
    } catch (e) {
      if (options.failSilently) {
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
