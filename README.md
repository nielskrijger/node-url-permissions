# Node URL Permission

This Node.js library facilitates formatting permissions for users or groups in the following way:

```
<path>?<parameters>:<privileges>
```

URL Permissions are intended to provide authorization for web services that:

1. have a REST API;
2. require permissions to be expressed in a succinct way;
3. have complex authorization requirements.

Read more about the [URL Permission format](https://github.com/nielskrijger/url-permissions).

## matches(searchPermissions)

Returns `true` if at least one `searchPermission` matches the constraints specified in `permission`, otherwise returns `false`.

```js
import permission from 'url-permissions';

// Basic examples
permission('/articles:read').matches('/articles:read'); // true
permission('/articles:read,update').matches('/articles:read'); // false
permission('/articles:read,update').matches('/articles:all'); // true
permission('/articles:read').matches(['/articles:read', '/articles:update']); // true
permission('/articles/article-1:read').matches('/articles:read'); // false
permission('/articles:read').matches('/articles/article-1:read'); // false

// Query parameter examples
permission('/articles?author=user-1:read').matches('/articles:read'); // true
permission('/articles?author=user-1&status=draft:read').matches('/articles?author=user-1:read'); // true
permission('/articles:read').matches('/articles?author=user-1:read'); // false

// Wildcards * and **
permission('/articles:read').matches('/art*cles:read'); // true
permission('/articles/article-1:read').matches('/articles/*:read'); // true
permission('/articles?author=user-2:read').matches('/articles/*:read'); // false
permission('/articles?author=user-2:read').matches('/articles/*:read'); // false
permission('/articles:read').matches('/articles/*:read'); // false
permission('/articles/*:read').matches('/articles/article-1/comments:read'); // false
permission('/articles/**:read').matches('/articles/article-1/comments:read'); // true

// Privilege aliases
permission('/articles:crud').matches('/articles:all'); // true
permission('/articles:all').matches('/articles:read'); // false
permission('/articles:read').matches('/articles:all'); // false
```

## path([ path ])

Gets or sets the permission path.

```js
const perm = permission('/articles:r');

perm.path(); // "/articles"
perm.path('/users');
perm.path(); // "/users"
```

## parameters([ parameters ])

Gets or sets the permission parameters.

```js
const perm = permission('/articles?attr1=test:r');

perm.parameters(); // { attr1: 'test' }
perm.parameters({ attr1: 'test2', attr2: 'test3' });
perm.parameters(); // { attr1: 'test2', attr2: 'test3' }
```

## privileges([ privileges ])

Gets or sets the permission privileges.

`privileges` can be either a string or an array of privileges. Privileges are identified either by a one-character identifier, a privilege name or an alias.

```js
const perm = permission('/articles?attr1=test:r');

perm.privileges(); // ['r']
perm.privileges('all,m');
perm.privileges(); // ['c', 'r', 'u', 'd', 'm']
perm.privileges(['all', 'm', 'super']);
perm.privileges(); // ['c', 'r', 'u', 'd', 'm', 's']
```

## grantPrivileges()

Gets the privileges that allow granting permissions.

```js
const perm = permission('/articles:read,manage,super');

perm.grantPrivileges(); // ['m', 's']
```

## mayGrant(newPermission [, granteePermissions])

Returns `true` if permission allows granting `newPermission` to grantee.

In the grant process we distinguish two roles:

- *grantor*: the person granting or revoking a permission.
- *grantee*: the person receiving or losing a permission.

To grant a permission the grantor must have "manage" or "super" privileges. The "manage" privilege allows granting permissions to users without either "manage" or "super" privilege. The "super" privilege allows granting permissions to anyone (including revoking other "super" privileges). Specify `granteePermissions` for the grantee's permissions.

The grantor/grantee privileges can be customized using `permission.config()`.

```js
import permission from 'url-permissions';

permission('/articles:manage').mayGrant('/articles:read', []); // true
permission('/articles:manage').mayGrant('/articles:read', ['/articles:delete']); // true
permission('/articles:manage').mayGrant('/articles:read', ['/articles:manage']); // false
permission('/articles:manage').mayGrant('/articles:read', ['/articles:manage']); // false
permission('/articles:manage').mayGrant('/articles:read', ['/unrelated:super']); // true

permission('/articles:super').mayGrant('/articles:read', ['/articles:manage']); // true
permission('/articles:super').mayGrant('/articles:read', ['/articles:manage', '/different:read']); // true
permission('/articles:super').mayGrant('/articles/article-1:read', ['/articles:manage']); // true
permission('/articles:super').mayGrant('/articles/article-1:read', ['/articles:super']); // true
```

## mayRevoke(newPermission [, granteePermissions])

An alias of `mayGrant(...)`.

## permission.config(options)

a static method to change global config options. Changing global config doesn't affect existing instances.

```js
import permission from 'url-permissions';

permission.config({
  privileges: {
    c: 'create',
    r: 'read',
    u: 'update',
    d: 'delete',
    s: 'super',
    m: 'manage',
  },
  aliases: {
    all: ['c', 'r', 'u', 'd'],
    manager: ['c', 'r', 'u', 'd', 'm'],
    owner: ['c', 'r', 'u', 'd', 's'],
  },
  grantPrivileges: {
    manage: ['c', 'r', 'u', 'd'],
    super: ['c', 'r', 'u', 'd', 's', 'm'],
  },
});
```

### grantPrivileges

`grantPrivileges` must be an object of key-value pairs where each key is a one-character privilege identifier and each value an array of privileges it is allowed to grant.

Anyone with grant privileges is allowed to grant its privileges to grantees without any grant privileges. However, if a grantee does have grant privileges its grant privileges must be covered by those of the grantor.

Example:

```js
import permission from 'url-permissions';

permission.config({
  grantPrivileges: {
    x: ['a'],
    y: ['a', 'x'],
    z: ['a', 'z'],
  },
});

permission('/articles:x').mayGrant('/articles:a'); // true
permission('/articles:x').mayGrant('/articles:a', ['/articles:x']); // false
permission('/articles:y').mayGrant('/articles:a', ['/articles:x']); // true
permission('/articles:y').mayGrant('/articles:a', ['/articles:y']); // false
permission('/articles:z').mayGrant('/articles:a', ['/articles:z']); // true
```

Notice the last example where `z` may grant a permission to a grantee with `z`, whereas an `y` may not grant the same permission to another `y`. We'll leave it to you to figure out why.

## toObject()

Returns an object representation of an URL permission containing three
properties: `url`, `attributes` and `actions`.

```js
import permission from 'url-permissions';

permission('/articles/*?author=user-1,user-2&flag=true:all').toObject()
// {
//   path: '/articles/*',
//   parameters: {
//     author: ['user-1', 'user-2'],
//     flag: ['true'],
//   },
//   privileges: ['r', 'c', 'u', 'd'],
// }
```

## validate()

Checks if url permission is valid.

```js
permission.validate('/articles?author=1,2:all,m'); // true
permission.validate('/articles?author=1,2'); // false, no privileges
permission.validate('/articles:unknown'); // false, unknown privilege/alias
permission.validate('?author=user-1:c'); // false, no path
```
