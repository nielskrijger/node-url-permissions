import _ from 'lodash';
import { isNumeric } from './util';

// Contains default global config
const defaultConfig = {
  privileges: {
    read: 1,
    create: 2,
    update: 4,
    delete: 8,
    crud: 15,
    manage: 16,
    manager: 31,
    own: 32,
    owner: 63,
    admin: 64,
    administrator: 127,
  },
  grantPrivileges: {
    manage: 15, // crud
    own: 63, // owner + all the rest
    admin: 127, // admin
  },
};

const config = _.cloneDeep(defaultConfig);

/**
 * Sets or retrieves privileges which allow granting permissions.
 */
function grantPrivileges(newGrantPrivileges = null) {
  if (newGrantPrivileges === false) {
    config.grantPrivileges = _.cloneDeep(defaultConfig.grantPrivileges);
  } else if (newGrantPrivileges) {
    Object.keys(newGrantPrivileges).forEach((key) => {
      if (!isNumeric(newGrantPrivileges[key])) {
        throw new Error(`Grant privilege '${key}' must specify a valid number`);
      }
    });

    // If config is valid assign override existing config
    config.grantPrivileges = _.cloneDeep(newGrantPrivileges);
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
      if (!isNumeric(newPrivileges[key])) {
        throw new Error(`Privilege identifier '${key}' must be a number`);
      }
    });
    config.privileges = _.cloneDeep(newPrivileges);
  }
  return config.privileges;
}

/**
 * Retrieves or sets configuration.
 *
 * When `false` resets config to default.
 */
export default (options) => {
  if (options === false) {
    privileges(false);
    grantPrivileges(false);
  } else if (options) {
    if (options.privileges) privileges(options.privileges);
    if (options.grantPrivileges) grantPrivileges(options.grantPrivileges);
  }
  return config;
};
