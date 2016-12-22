import URLPermission from './URLPermission';
import config from './config';
import validate from './validate';

function permission(perm) {
  return new URLPermission(perm);
}

permission.config = config;
permission.validate = validate;

export default permission;
