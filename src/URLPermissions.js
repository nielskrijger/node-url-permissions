import _ from 'lodash';
import URLPermission from './URLPermission';

/**
 * Models multiple permissions.
 */
export default class URLPermissions {
  /**
   * Creates new URLPermission instance based on a permission string.
   */
  constructor(...perms) {
    this._permissions = _.flatten(perms).map(e => new URLPermission(e));
  }

  /**
   * Sets or retrieves permissions.
   */
  permissions(permissions) {
    if (permissions !== undefined) {
      this._permissions = _.flatten(perms).map(e => new URLPermission(e));
      return this;
    }
    return this._permissions;
  }

  /**
   * Returns `true` when all specified permissions are covered by at least one
   * of the permissions.
   *
   * `permissions` can be either permission strings or an URLPermission object.
   *
   * Throws an error when any permission is invalid.
   */
  allows(...perms) {
    // Transform each permission string to an object.
    const permissions = _.flatten(_.flatten(perms).map(e => {
      return this._unwindParameters(e);
    }));

    // For each permission remove any privilege that is covered by any of our
    // own permissions.
    const ourPermissions = this.permissions();
    return _.every(permissions, (permission) => {
      let i = 0;
      while (permission.privileges() > 0 && i < ourPermissions.length) {
        if (ourPermissions[i].matchUrl(permission)) {
          permission.privileges(permission.privileges() & ~ourPermissions[i].privileges()); // Remove flag
        }
        i++;
      }
      return permission.privileges() === 0;
    });
  }

  /**
   * Returns `true` if any or a combination of this collection's permissions
   * allow granting `newPermission` to grantee.
   */
   mayGrant(newPermission, granteePermissions = []) {
     return this._mayGrantOrRevoke('mayGrant', newPermission, granteePermissions);
   }

  /**
   * Returns `true` if any or a combination of this collection's permissions
   * allow revoking `permission` from grantee.
   */
   mayRevoke(permission, granteePermissions = []) {
     return this._mayGrantOrRevoke('mayRevoke', permission, granteePermissions);
   }

   /**
    * This private function contains the common logic of `mayGrant` and
    * `mayRevoke`. Specify `functionName` either `mayGrant` or `mayRevoke`.
    */
   _mayGrantOrRevoke(functionName, newPermission, granteePermissions = []) {
     const newPerms = _.flatten(this._unwindParameters(newPermission));
     const ourPerms = this.permissions();
     return _.every(newPerms, (newPerm) => {
       return _.some(ourPerms, (ourPerm) => ourPerm[functionName](newPerm, granteePermissions));
     });
   }

  /**
   * Returns an array with permissions for each and every parameter value.
   *
   * For example:
   * ```
   * _unwindPermission('/articles?var1=foo1,foo2&var2=foo3,foo4:read,update');
   * // [
   * //   "/articles?var1=foo1&var2=foo3:read,update",
   * //   "/articles?var1=foo1&var2=foo4:read,update",
   * //   "/articles?var1=foo2&var2=foo3:read,update",
   * //   "/articles?var1=foo2&var2=foo4:read,update",
   * // ]
   * ```
   */
  _unwindParameters(permission) {
    const perm = new URLPermission(permission);
    const params = perm.parameters();
    if (!params) return [perm]; // Simply return, nothing to unwind

    // Recursive function that returns an array with one object for each unique
    // path in the `params` object.
    const unwind = (keys, keyIndex) => {
      const result = [];
      params[keys[keyIndex]].forEach((value) => {
        const newValue = { [keys[keyIndex]]: value };
        if (keyIndex === keys.length - 1) {
          // We've reached the end of the tree, simply return the new value
          result.push(newValue);
        } else {
          // We've not yet reached the end of the tree, append each child to new value
          unwind(keys, keyIndex + 1).forEach((child) => {
            result.push(Object.assign({}, newValue, child));
          });
        }
      });
      return result;
    }

    // For each path, generate a new permission with unique parameters
    return unwind(Object.keys(params), 0).map((unwindedParams) => {
      return perm.clone().parameters(unwindedParams);
    });
  }
}
