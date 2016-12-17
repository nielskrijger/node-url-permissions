import _ from 'lodash';

// Contains default global config
const defaultConfig = {
  privileges: {
    c: 'create',
    r: 'read',
    u: 'update',
    d: 'delete',
    s: 'super',
    m: 'manage',
  },
  aliases: {
    all: ['c', 'r', 'u', 'd'],
    manager: ['c', 'r', 'u', 'd', 'm'],
    owner: ['c', 'r', 'u', 'd', 's'],
  },
  grantPrivileges: {
    m: ['c', 'r', 'u', 'd'],
    s: ['c', 'r', 'u', 'd', 's', 'm'],
  },
};

const config = _.cloneDeep(defaultConfig);

/**
 * Returns the one-character identifier of a privilege.
 *
 * Throws an error if privilege could not be found.
 */
function privilege(priv) {
  if (priv.length === 1) {
    if (!config.privileges[priv]) {
      throw new Error(`Privilege '${priv}' does not exist'`);
    }
    return priv;
  }
  const invertedPrivs = _.invert(config.privileges);
  const key = invertedPrivs[priv];
  if (!key) {
    throw new Error(`Privilege '${priv}' does not exist'`);
  }
  return invertedPrivs[priv];
}

/**
 * Sets or retrieves privileges which allow granting permissions.
 */
function grantPrivileges(newGrantPrivileges = null) {
  if (newGrantPrivileges === false) {
    config.grantPrivileges = _.cloneDeep(defaultConfig.grantPrivileges);
  } else if (newGrantPrivileges) {
    const newConfig = {};
    Object.keys(newGrantPrivileges).forEach((key) => {
      if (!_.isArray(newGrantPrivileges[key])) {
        throw new Error(`Privilege '${key}' must contain an array`);
      }
      const newKey = privilege(key);
      newConfig[newKey] = newGrantPrivileges[key].map(elm => privilege(elm));
    });

    // If config is valid assign override existing config
    config.grantPrivileges = newConfig;
  }
  return config.grantPrivileges;
}

/**
 * Sets or retrieves global privilege config.
 */
function privileges(newPrivileges = null) {
  if (newPrivileges === false) {
    config.privileges = _.cloneDeep(defaultConfig.privileges);
  } else if (newPrivileges) {
    if (!_.isPlainObject(newPrivileges)) {
      throw new Error('Privileges must an object');
    }
    Object.keys(newPrivileges).forEach((key) => {
      if (newPrivileges[key].length <= 1) {
        throw new Error(`Privilege name '${newPrivileges[key]}' must be at least 2 characters`);
      }
      if (key.length > 1) {
        throw new Error(`Privilege identifier '${key}' must be 1 character`);
      }
    });
    config.privileges = _.cloneDeep(newPrivileges);
  }
  return config.privileges;
}

/**
 * Sets or retrieves global alias config.
 */
function aliases(newAliases = null) {
  if (newAliases === false) {
    config.aliases = _.cloneDeep(defaultConfig.aliases);
  } else if (newAliases) {
    if (!_.isPlainObject(newAliases)) {
      throw new Error('Aliases must an object');
    }
    Object.keys(newAliases).forEach((alias) => {
      if (!_.isArray(newAliases[alias])) {
        throw new Error(`Alias '${alias}' must contain an array`);
      }
      newAliases[alias].forEach((priv) => {
        if (!config.privileges[priv]) {
          throw new Error(`Alias '${alias}' contains unknown privilege identifier '${priv}'`);
        }
      });
    });
    config.aliases = _.cloneDeep(newAliases);
  }
  return config.aliases;
}

/**
 * Retrieves or sets configuration.
 *
 * When `false` resets config to default.
 */
export default (options) => {
  if (options === false) {
    privileges(false);
    aliases(false);
    grantPrivileges(false);
  } else if (options) {
    if (options.privileges) privileges(options.privileges);
    if (options.aliases) aliases(options.aliases);
    if (options.grantPrivileges) grantPrivileges(options.grantPrivileges);
  }
  return config;
};
