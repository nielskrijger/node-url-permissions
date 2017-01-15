import _ from 'lodash';
import config from './config';
import { isNumeric } from './util';

/**
 * Validates privilege string.
 *
 * A privilege string can contain any combination of privilege names and numbers.
 *
 * Example:
 * ```
 * validatePrivileges('crud,manage'); // true
 * validatePrivileges('5,read'); // true
 * validatePrivileges('invalid'); // false
 * ```
 */
function validatePrivileges(privilegeString) {
  const settings = config();
  const privileges = privilegeString.split(',');
  const privilegeNames = Object.keys(settings.privileges);
  const privilegeNumbers = _.values(settings.privileges);

  for (const privilege of privileges) {
    if (isNumeric(privilege)) {
      if (!privilegeNumbers.includes(privilege)) return false;
    } else if (!privilegeNames.includes(privilege)) {
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
