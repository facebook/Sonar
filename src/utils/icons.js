/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

/* This file needs to be plain JS to be imported by scripts/build-release.js */
/* eslint-disable import/no-commonjs */

const AVAILABLE_SIZES = [8, 10, 12, 16, 18, 20, 24, 32];
const DENSITIES = [1, 1.5, 2, 3, 4];
const fs = require('fs');
const path = require('path');
const {remote} = require('electron');

const ICONS = {
  'arrow-right': [12],
  'caution-octagon': [16],
  'caution-triangle': [16],
  'info-circle': [16],
  'magic-wand': [20],
  'magnifying-glass': [16, 20],
  'minus-circle': [12],
  mobile: [12],
  box: [12],
  desktop: [12],
  bug: [12],
  posts: [20],
  rocket: [20],
  tools: [20],
  'triangle-down': [12],
  'triangle-right': [12],
  'chevron-right': [8],
  'chevron-down': [8],
  star: [16, 24],
  'star-outline': [16, 24],
  camera: [12],
  camcorder: [12],
  'bell-null': [12],
  'question-circle-outline': [16],
  'chevron-down-outline': [10],
  'app-dailies': [12],
  apps: [12],
  internet: [12],
  profile: [12],
  target: [12],
  bird: [12],
  settings: [12],
  directions: [12],
  'dots-3-circle-outline': [16],
};

// Takes a string like 'star', or 'star-outline', and converts it to
// {trimmedName: 'star', variant: 'filled'} or {trimmedName: 'star', variant: 'outline'}
function getIconPartsFromName(icon) {
  const isOutlineVersion = icon.endsWith('-outline');
  const trimmedName = isOutlineVersion ? icon.replace('-outline', '') : icon;
  const variant = isOutlineVersion ? 'outline' : 'filled';
  return {trimmedName: trimmedName, variant: variant};
}

// $FlowFixMe not using flow in this file
function buildLocalIconPath(name, size, density) {
  const icon = getIconPartsFromName(name);
  return path.join(
    'icons',
    `${icon.trimmedName}-${icon.variant}-${size}@${density}x.png`,
  );
}

// $FlowFixMe not using flow in this file
function buildIconURL(name, size, density) {
  const icon = getIconPartsFromName(name);
  const url = `https://external.xx.fbcdn.net/assets/?name=${
    icon.trimmedName
  }&variant=${
    icon.variant
  }&size=${size}&set=facebook_icons&density=${density}x`;
  if (
    typeof window !== 'undefined' &&
    (!ICONS[name] || !ICONS[name].includes(size))
  ) {
    console.warn(
      `Using uncached icon: "${name}: [${size}]" Add it to icons.js to preload it.`,
    );
  }
  return url;
}

module.exports = {
  ICONS: ICONS,

  buildLocalIconPath: buildLocalIconPath,
  buildIconURL: buildIconURL,

  // $FlowFixMe: not using flow in this file
  getIconURL(name, size, density) {
    if (name.indexOf('/') > -1) {
      return name;
    }

    let requestedSize = size;
    if (!AVAILABLE_SIZES.includes(size)) {
      // find the next largest size
      const possibleSize = AVAILABLE_SIZES.find(size => {
        return size > requestedSize;
      });

      // set to largest size if the real size is larger than what we have
      if (possibleSize == null) {
        requestedSize = Math.max(...AVAILABLE_SIZES);
      } else {
        requestedSize = possibleSize;
      }
    }

    if (!DENSITIES.includes(density)) {
      // find the next largest size
      const possibleDensity = DENSITIES.find(scale => {
        return scale > density;
      });

      // set to largest size if the real size is larger than what we have
      if (possibleDensity == null) {
        density = Math.max(...DENSITIES);
      } else {
        density = possibleDensity;
      }
    }

    const localPath = buildLocalIconPath(name, size, density);
    // resolve icon locally if possible
    if (
      remote &&
      fs.existsSync(path.join(remote.app.getAppPath(), localPath))
    ) {
      return localPath;
    }
    return buildIconURL(name, requestedSize, density);
  },
};
