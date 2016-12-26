import _ from 'lodash';
import globToRegex from './globToRegex';
import config from './config';

/**
 * Models a permission string.
 */
export default class URLPermission {
  /**
   * Creates new URLPermission instance based on a permission string.
   */
  constructor(permissionString) {
    this._config = _.cloneDeep(config());
    const props = this._parse(permissionString);
    Object.assign(this, {
      _path: props.path,
      _parameters: props.parameters,
      _privileges: props.privileges,
    });
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
        this._parameters = parameters;
      } else if (_.isString(parameters)) {
        this._parameters = this._parseParameters(parameters);
      } else {
        throw new Error('Parameters must be an object or string');
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
      } else {
        throw new Error('Privileges must be an array or string');
      }
      return this;
    }
    return this._privileges;
  }

  /**
   * Returns the privileges which enable granting permissions.
   */
  grantPrivileges() {
    const grantIdentifiers = Object.keys(this._config.grantPrivileges);
    return this.privileges().filter(e => grantIdentifiers.includes(e));
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
   * Parses an URL permission privilege string and returns an array with
   * one-character privilege identifiers.
   *
   * A single URL permission string is either one or more abbreviations, an alias
   * or a comma-separated list of privilege names.
   *
   * For example, `ru`, `read`, `owner`, and `read,update` are valid.
   */
  _parsePrivileges(privilegeString) {
    const result = [];
    const privsInverted = _.invert(this._config.privileges);
    for (const privilege of privilegeString.split(',')) {
      if (privsInverted[privilege]) {
        // Is privilege name, return its abbreviation
        result.push(privsInverted[privilege]);
      } else {
        let abbr = privilege;

        // An alias always overrides any abreviations
        if (this._config.aliases[privilege]) {
          abbr = this._config.aliases[privilege].join('');
        }

        // Parse abbreviations
        for (let i = 0; i < abbr.length; i += 1) {
          if (!this._config.privileges[abbr.charAt(i)]) {
            throw new Error(`Privilege '${abbr.charAt(i)}' does not exist`);
          }
          result.push(abbr.charAt(i));
        }
      }
    }

    return result;
  }

  /**
   * Parses URL Permission query string.
   */
  _parseParameters(parameterString) {
    if (parameterString.startsWith('?')) {
      parameterString = parameterString.substring(1);
    }
    const pieces = parameterString.split('&');
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
    return _.every(this.privileges(), e => userPrivileges.includes(e));
  }

  /**
   * Checks whether parameters are covered by this URL permission.
   *
   * Returns `true` if all of parameters are covered by `requiredAttrs`,
   * otherwise returns `false`.
   */
  matchParameters(parameters) {
    // If user has no parameters it means he is granted all possible parameters
    if (!parameters) return true;

    // eslint-disable-next-line no-restricted-syntax
    for (const key in parameters) {
      // If required parameter does not exist then user parameters must contain
      // a wildcard.
      if (!this.parameters() || !this.parameters()[key]) {
        return parameters[key].includes('*');
      }

      // If any user parameter is not covered by required parameters then
      // return false.
      const isCovered = _.some(parameters[key], (userAttr) => {
        return this.parameters()[key].includes(userAttr);
      });
      if (!isCovered) return false;
    }
    return true;
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
   * Returns `true` when url path, query parameters and privileges are covered
   * by at least one of the spcified permissions.
   *
   * `permissions` can be either a string, an URLPermission or an array thereof.
   */
  matches(permissions) {
    if (!_.isArray(permissions)) {
      permissions = [permissions];
    }
    for (let i = 0; i < permissions.length; i += 1) {
      if (_.isString(permissions[i])) {
        permissions[i] = new URLPermission(permissions[i]);
      }
    }
    for (const permission of permissions) {
      // When there is a match return immediately; just 1 user permission has to match
      if (this.matchUrl(permission) && this.matchPrivileges(permission.privileges())) {
        return true;
      }
    }
    return false;
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
    // Find privileges that would allow this permission grant permissions
    const myGrants = this.grantPrivileges();
    if (myGrants.length === 0) {
      return false; // No granting privilege found
    }

    // New permission url must be covered by url and parameters
    const newPermission = new URLPermission(permission);
    if (!this.matchUrl(newPermission)) {
      return false;
    }

    // All other grantPrivileges must be covered by our grantPrivileges
    // const granteePerms = granteePermissions;
    const applicableGranteeGrants = granteePermissions
      .map(e => new URLPermission(e))
      .filter(perm => this.matchUrl(perm))
      .map(e => e.grantPrivileges());

    const otherGrants = _.chain(newPermission.grantPrivileges())
      .concat(applicableGranteeGrants)
      .compact()
      .flatten()
      .value();

    if (otherGrants.length > 0) {
      const allowedGrants = _.chain(this._config.grantPrivileges)
        .pick(myGrants)
        .values()
        .flatten()
        .value();

      if (_.difference(otherGrants, allowedGrants).length > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * An alias of `mayGrant()`.
   */
  mayRevoke(...args) {
    return this.mayGrant(...args);
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
}
