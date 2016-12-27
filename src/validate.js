import _ from 'lodash';
import config from './config';

/**
 * Validates privilege string.
 *
 * A privilege string can contain any combination of privilege identifiers,
 * privilege names and aliases.
 *
 * Example:
 * ```
 * validatePrivileges('crud,manage'); // true
 * validatePrivileges('owner,read'); // true
 * validatePrivileges('invalid'); // false
 * ```
 */
function validatePrivileges(privilegeString) {
  const settings = config();
  const privileges = privilegeString.split(',');
  const aliases = Object.keys(settings.aliases);
  const privilegeNames = _.values(settings.privileges);
  const privilegeIdentifiers = Object.keys(settings.privileges);

  for (const privilege of privileges) {
    if (privilege.length > 1) {
      // Check if privilege is either an alias or privilege name
      if (aliases.includes(privilege)) continue;
      if (privilegeNames.includes(privilege)) continue;

      // If not alias or privilege name the value must be a combination of
      // privilege identifiers
      for (let i = 0; i < privilege.length; i += 1) {
        if (!privilegeIdentifiers.includes(privilege.charAt(i))) {
          return false;
        }
      }
    } else if (!privilegeIdentifiers.includes(privilege)) {
      return false;
    }
  }
  return true;
}

/**
 * Validates an URL permission string.
 */
export default (permission) => {
  if (!_.isString(permission)) {
    return false;
  }

  // Check if string contains privilege delimiter
  const privilegeDelimiterIndex = permission.lastIndexOf(':');
  if (privilegeDelimiterIndex === -1) {
    return false;
  }
  const url = permission.substring(0, privilegeDelimiterIndex);

  // Check if path length >= 1
  const attributeDelimiterIndex = url.indexOf('?');
  if (attributeDelimiterIndex === 0 || url.length === 0) {
    return false;
  }

  // Check if all privileges are valid aliases, action names or identifiers
  const validPrivilege = validatePrivileges(permission.substring(privilegeDelimiterIndex + 1));
  if (!validPrivilege) return false;

  return true;
};
