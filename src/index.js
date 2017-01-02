import URLPermission from './URLPermission';
import URLPermissions from './URLPermissions';
import config from './config';
import validate from './validate';

function permission(perm) {
  return new URLPermission(perm);
}

function permissions(...perms) {
  return new URLPermissions(...perms);
}

permission.config = config;
permission.validate = validate;

export { permission, permissions };
