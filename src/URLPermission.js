import _ from 'lodash';
import globToRegex from './globToRegex';
import config from './config';
import { isNumeric } from './util';

/**
 * Models a permission string.
 */
export default class URLPermission {
  /**
   * Creates new URLPermission instance based on a permission string.
   */
  constructor(permission) {
    if (_.isString(permission)) {
      // Parse permission string using global config options
      this._config = _.cloneDeep(config());
      const props = this._parse(permission);
      Object.assign(this, {
        _path: props.path,
        _parameters: props.parameters,
        _privileges: props.privileges,
      });
    } else if (permission instanceof URLPermission) {
      // Copy all private properties
      Object.assign(this, {
        _config: _.cloneDeep(permission._config),
        _path: permission.path(),
        _parameters: _.cloneDeep(permission.parameters()),
        _privileges: _.cloneDeep(permission.privileges()),
      });
    } else {
      throw new Error('Permission must be a string or URLPermission instance');
    }
  }

  /**
   * Sets or retrieves the url path.
   */
  path(path) {
    if (path !== undefined) {
      if (_.isString(path)) {
        this._path = path;
      } else {
        throw new Error('Path must be a string');
      }
      return this;
    }
    return this._path;
  }

  /**
   * Sets or retrieves url parameters.
   */
  parameters(parameters) {
    if (parameters !== undefined) {
      if (_.isObject(parameters)) {
        this._parameters = _.cloneDeep(parameters);

        Object.keys(this._parameters).forEach((key) => {
          // Parse comma separated string
          if (_.isString(this._parameters[key])) {
            this._parameters[key] = this._parameters[key].split(',');
          }

          // If parameter is neither a string or string array throw error
          if (!_.isArray(this._parameters[key])) {
            throw new Error('Parameter value must be either a string or an array of strings');
          }
        });
      } else if (_.isString(parameters)) {
        this._parameters = this._parseParameters(parameters);
      } else {
        throw new Error('Parameters must be an URLPermission object or a permission string');
      }
      return this;
    }
    return this._parameters;
  }

  /**
   * Sets or retrieves privileges.
   */
  privileges(privileges) {
    if (privileges !== undefined) {
      if (_.isArray(privileges)) {
        this._privileges = this._parsePrivileges(privileges.join(','));
      } else if (_.isString(privileges)) {
        this._privileges = this._parsePrivileges(privileges);
      } else if (_.isNumber(privileges)) {
        this._privileges = privileges;
      } else {
        throw new Error('Privileges must be an array, string or number');
      }
      return this;
    }
    return this._privileges;
  }

  /**
   * Returns `true` if permission has specified privilege.
   */
  hasPrivilege(privilege) {
    if (_.isArray(privilege)) {
      return _.every(privilege, e => this.hasPrivilege(e));
    }

    // Privilege parameter is itself a bitmask
    const ourBitmask = this.privileges();
    if (_.isNumber(privilege)) {
      return (privilege <= ourBitmask) && (ourBitmask & privilege) > 0;
    }

    // Privilege is a string
    if (_.isString(privilege)) {
      return _.every(privilege.split(','), (privilege) => {
        const bitmask = this._parsePrivileges(privilege);

        // Returns true if bitmask is captured in our bitmask
        return (bitmask <= ourBitmask) && (ourBitmask & bitmask) > 0;
      });
    }

    throw new Error('Privilege must be an array, string or number');
  }

  /**
   * Returns `true` if permission has specified privileges.
   */
  hasPrivileges(privileges) {
    return this.hasPrivilege(privileges);
  }

  /**
   * Returns array with all privilege names that enable granting new privileges.
   */
  grantPrivileges() {
    let result = [];
    Object.keys(this._config.grantPrivileges).forEach((privilege) => {
      if (this.hasPrivilege(privilege)) {
        result.push(privilege);
      }
    });
    return result;
  }

  /**
   * Returns bitmask describing which permissions may be granted.
   */
  grantsAllowed() {
    return this.grantPrivileges().reduce((a, b) => {
      return a | this._config.grantPrivileges[b];
    }, 0);
  }

  /**
   * Parses an URL Permission and returns an object with all URL permission
   * properties.
   *
   * For example, `/articles/**?author=johndoe:read,update` returns the following:
   * ```
   * {
   *   path: '/articles/**',
   *   parameters: {
   *     author: 'johndoe',
   *   },
   *   privileges: ['r', 'u'],
   * }
   * ```
   */
  _parse(permission) {
    if (!_.isString(permission)) {
      throw new Error('Permission must be a string');
    }

    const result = {
      path: null,
      parameters: null,
      privileges: [],
    };

    // Determine url path and privileges
    const delimiterIndex = permission.lastIndexOf(':');
    if (delimiterIndex === -1) {
      throw new Error('Permission must contain at least 1 privilege delimited by ":"');
    }
    result.path = permission.substring(0, delimiterIndex);
    result.privileges = this._parsePrivileges(permission.substring(delimiterIndex + 1));

    // Parse query parameters
    const questionIndex = result.path.indexOf('?');
    if (questionIndex > -1) {
      result.parameters = this._parseParameters(result.path.substring(questionIndex + 1));
      result.path = result.path.substring(0, questionIndex);
    }

    return result;
  }

  /**
   * Parses an URL permission privilege string and returns a bitmask.
   *
   * A single URL permission string is either one or more abbreviations, an alias
   * or an integer.
   *
   * For example, `13`, `read`, `owner`, and `read,update` are valid.
   */
  _parsePrivileges(privilegeString) {
    // When privilege is a number ensure it is in range
    if (isNumeric(privilegeString)) {
      const result = parseInt(privilegeString, 10);
      const max = _.max(_.values(this._config.privileges));
      if (result <= 0 || result > max) {
        throw new Error(`Privilege must be a number between 1 and ${max}`);
      }
      return result;
    }

    // Add each permission to bitmask
    let bitmask = 0;
    privilegeString.split(',').forEach((privilege) => {
      if (!this._config.privileges[privilege]) {
        throw new Error(`Privilege '${privilege}' does not exist`);
      }
      bitmask = bitmask | this._config.privileges[privilege];
    });
    return bitmask;
  }

  /**
   * Parses URL Permission query string.
   */
  _parseParameters(parameterString) {
    let paramString = parameterString;
    if (paramString.startsWith('?')) {
      paramString = paramString.substring(1);
    }
    const pieces = paramString.split('&');
    const result = {};
    for (const piece of pieces) {
      const [key, value] = piece.split('=');
      result[key] = value.split(',');
    }
    return result;
  }

  /**
   * Checks whether privileges are covered by this URL permission.
   *
   * Returns `true` if all privileges are covered by specified `userPrivileges`,
   * otherwise returns `false`.
   */
  matchPrivileges(userPrivileges) {
    const ourPrivileges = this.privileges();
    return (userPrivileges <= ourPrivileges) && ((ourPrivileges & userPrivileges) !== 0);
  }

  /**
   * Checks whether parameters are covered by this URL permission.
   *
   * Returns `true` if all of parameters are covered by `requiredAttrs`,
   * otherwise returns `false`.
   */
  matchParameters(parameters) {
    // If permission has no parameters it means he is granted all possible parameters
    const ourParams = this.parameters();
    if (!ourParams) return true;

    return _.every(Object.keys(ourParams), (key) => {
      // Parameter must be defined
      if (!parameters || !parameters[key]) {
        return false;
      }

      // If parameter exists, check if param values are all included
      return _.every(parameters[key], e => ourParams[key].includes(e));
    });
  }

  /**
   * Checks whether url path is covered by this URL permission.
   *
   * Returns `true` when url path matches, otherwise return `false`.
   */
  matchPath(path) {
    return globToRegex(path).test(this.path()) || globToRegex(this.path()).test(path);
  }

  /**
   * Returns `true` when this permission covers all specified permissions.
   *
   * `permissions` can be either permission strings or an URLPermission object.
   *
   * Throws an error when permission string is invalid.
   */
  allows(...permissions) {
    const perms = _.flatten(permissions).map(e => new URLPermission(e));
    return _.every(perms, e => this.matchUrl(e) && this.matchPrivileges(e.privileges()));
  }

  /**
   * Checks if permission matches url path and query parameters.
   */
  matchUrl(permission) {
    if (_.isString(permission)) {
      permission = new URLPermission(permission);
    }
    return this.matchPath(permission.path()) && this.matchParameters(permission.parameters());
  }

  /**
   * Returns `true` if permission allows granting `permission` to grantee.
   */
  mayGrant(permission, granteePermissions = []) {
    const newPermission = new URLPermission(permission);
    if (this.grantsAllowed() === 0 || !this.matchUrl(newPermission)) return false;

    // All other grantPrivileges must be covered by our grantPrivileges
    return this._areLesserPrivileges(newPermission, granteePermissions);
  }

  /**
   * Returns `true` if permission allows revoking `permission` from grantee.
   */
  mayRevoke(permission, granteePermissions = []) {
    return this.mayGrant(permission, granteePermissions);
  }

  /**
   * Returns `true` when none of `granteePermissions` privileges are grant
   * privileges that are higher up in hierarchy.
   */
  _areLesserPrivileges(newPermission, granteePermissions = []) {
    // All privileges to be granted must be covered by our own bitmask
    const allowedBitmask = this.grantsAllowed();
    const toGrantBitmask = newPermission.privileges();
    if (toGrantBitmask > allowedBitmask || toGrantBitmask & allowedBitmask === 0) {
      return false;
    }

    // Any privileges that may be granted by grantee must be covered by grantor
    if (granteePermissions.length > 0) {
      const allGranteePrivs = granteePermissions
        .map(e => new URLPermission(e))
        .filter(e => e.matchUrl(this))
        .map(e => e.grantPrivileges()) // Get bitmasks of grant privileges themselves, not what they grant!
        .reduce((a, b) => a.concat(b), []) // flatten
        .map(e => (e) ? this._config.privileges[e] : 0)
        .reduce((a, b) => a | b, 0);
      if (allGranteePrivs !== 0 && (allGranteePrivs > allowedBitmask || allowedBitmask & allGranteePrivs === 0)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns a clone of this URLPermission.
   */
  clone() {
    return new URLPermission(this);
  }

  /**
   * Returns an object representation of an URL permission.
   */
  toObject() {
    return {
      path: this.path(),
      parameters: this.parameters(),
      privileges: this.privileges(),
    };
  }

  /**
   * Returns a string representation of an URL permission.
   */
  toString() {
    let result = this.path();
    const params = this.parameters();
    if (params) {
      result += '?';
      Object.keys(params).forEach((key, i) => {
        if (i > 0) result += '&';
        result += `${key}=${params[key].join(',')}`;
      });
    }
    result += `:${this.privileges()}`;
    return result;
  }
}
