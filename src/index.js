import URLPermission from './URLPermission';
import config from './config';

function permission(perm) {
  return new URLPermission(perm);
}

permission.config = config;

export default permission;
