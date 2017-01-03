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
    return _.every(userPrivileges, e => this.privileges().includes(e));
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
    if (this.grantPrivileges().length === 0 || !this.matchUrl(newPermission)) return false;

    // If all new privileges are non grants allow any grantor to add them
    if (newPermission.grantPrivileges().length === 0) return true;

    // All other grantPrivileges must be covered by our grantPrivileges
    return this._areLesserPrivileges(newPermission.grantPrivileges(), granteePermissions);
  }

  /**
   * Returns `true` if permission allows revoking `permission` from grantee.
   */
  mayRevoke(permission, granteePermissions = []) {
    const newPermission = new URLPermission(permission);
    if (this.grantPrivileges().length === 0 || !this.matchUrl(newPermission)) return false;

    // All other grantPrivileges must be covered by our grantPrivileges
    return this._areLesserPrivileges(newPermission.grantPrivileges(), granteePermissions);
  }

  /**
   * Returns `true` when none of `granteePermissions` privileges are grant
   * privileges that are higher up in hierarchy.
   */
  _areLesserPrivileges(grantPrivileges, granteePermissions) {
    const allGrantPrivs = granteePermissions
      .map(e => new URLPermission(e))
      .filter(e => this.matchUrl(e))
      .map(e => e.grantPrivileges())
      .reduce((a, b) => a.concat(b), [])
      .concat(grantPrivileges);

    if (allGrantPrivs.length > 0) {
      const allowedGrantPrivs = _.chain(this._config.grantPrivileges)
        .pick(this.grantPrivileges())
        .values()
        .flatten()
        .value();

      if (_.difference(allGrantPrivs, allowedGrantPrivs).length > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns a clone of this URLPermission.
   */
  clone() {
    return new URLPermission(this.toString());
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
    result += `:${this.privileges().join('')}`;
    return result;
  }
}
