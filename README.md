# Node URL Permission

This Node.js library facilitates formatting permissions for users, groups or any other security principal in the following way:

```
<path>?<parameters>:<privileges>
```

**For example:**

```js
import { permissions } from 'url-permissions';

function authorize(userPermissions) {
  if (!permissions(userPermissions).allows('/articles:read')) {
    throw new Error('Not allowed here!')
  }
}

// Permission '/articles:read,create' will grant access to '/articles:read'
authorize(['/articles:read', '/accounts/12345:owner', '/articles?author=12345:owner']);
```

# Description

URL Permissions are intended to provide authorization for web services that:

1. have a REST API;
2. require permissions to be expressed in a succinct way;
3. have complex authorization requirements.

Read more about the [URL Permission format](https://github.com/nielskrijger/url-permissions).

## Format

```
<path>?<parameters>:<privileges>
```

An URL Permission consists of three components:

1. **Path**. The path identifies which resource the permission applies to. Paths can be absolute pathnames (starting with `/`) or an entire url with domain name and url scheme.

    Paths may include wildcards `_` (single character) and `*` (any or zero characters).

    For example, to read a user comment accessible at `https://api.example.com/articles/article-1/comments/comment-1` you might use one of the following URL permissions:

    ```
    /articles/*:read
    /articles/*/comments/*:read
    https://api.example.com/articles/*:read
    https://api.example.com/articles/article-1/comments/comment-1:read
    ```

2. **Parameters**. Parameters are optional attribute-based restrictions and are  very similar to url query parameters.

    For example, the permission `/articles:read` grants read access to all articles whereas:

    ```
    /articles?author=user-1:read
    ```

    ... grants read access only to articles whose author is `user-1`.

    You can specify multiple parameters and values like so:

    ```
    /articles?author=user-1,user-2&status=published:r
    ```

    ... which allows read access of published articles whose author is `user-1` or `user-2` (comma-separated values are evaluated as OR).

3. **Privileges**. Privileges specify which operations are allowed on the resource. You can either specify these as a comma-separated set of names, a string of identifiers, an alias, or a combination thereof (e.g. `create,read,update,delete`, `crud` and `all` are equivalent). Privileges are fully customizable. The default are:

    Identifier | Name      | Description
    -----------|-----------|-----------------
    `r`        | `read`    | View resource.
    `c`        | `create`  | Create resource.
    `u`        | `update`  | Update resource.
    `d`        | `delete`  | Delete resource.
    `m`        | `manage`  | Set permissions of users or groups without `manage` or `super` permission for the applicable resource.
    `s`        | `super`   | Set permissions of all users and groups for the applicable resource.

    In addition to the privileges above the following aliases exist:

    Name      | Alias for | Description
    ----------|-----------|-------------------
    `all`     | `crud`    | Allows user to perform the most common operations on a resource apart from changing user or group permissions.
    `manager` | `crudm`   | Allows user to perform CRUD operations and set permissions of users without `manager` or `owner` permissions.
    `owner`   | `cruds`   | Allows all possible operations on resource.

# permission(perm)

The `permission(perm)` function enables a variety of evaluation and transformation methods. To evaluate a collection of permissions scroll down until you hit the `permissions(perms[])` section.

## allows(searchPermissions[])

Returns `true` if all `searchPermissions` are matched by the permission, otherwise returns `false`.

```js
import { permission } from 'url-permissions';

// Basic examples
permission('/articles:read').allows('/articles:read'); // true
permission('/articles:read,update').allows('/articles:read'); // true
permission('/articles:all').allows('/articles:read,update'); // false
permission('/articles:read,update').allows('/articles:all'); // false
permission('/articles:read').allows(['/articles:read', '/articles:update']); // false
permission('/articles/article-1:read').allows('/articles:read'); // false
permission('/articles:read').allows('/articles/article-1:read'); // false
permission('/articles:read,update').allows('/articles:read', '/articles:update'); // true
permission('/articles:read').allows('/articles:read', '/articles:update'); // false

// Query parameter examples
permission('/articles:read').allows('/articles?author=user-1:read'); // true
permission('/articles?author=user-1:read').allows('/articles:read'); // false
permission('/articles?author=user-1:read').allows('/articles?author=user-1&status=draft:read'); // true
permission('/articles?author=user-1&status=draft:read').allows('/articles?author=user-1:read'); // false

// Wildcards * and **
permission('/articles:read').allows('/art*cles:read'); // true
permission('/articles/article-1:read').allows('/articles/*:read'); // true
permission('/articles?author=user-2:read').allows('/articles/*:read'); // false
permission('/articles?author=user-2:read').allows('/articles/*:read'); // false
permission('/articles:read').allows('/articles/*:read'); // false
permission('/articles/*:read').allows('/articles/article-1/comments:read'); // false
permission('/articles/**:read').allows('/articles/article-1/comments:read'); // true

// Privilege aliases
permission('/articles:crud').allows('/articles:all'); // true
permission('/articles:all').allows('/articles:read'); // false
permission('/articles:read').allows('/articles:all'); // false
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

Gets the privileges which allow granting permissions.

```js
const perm = permission('/articles:read,manage,super');

perm.grantPrivileges(); // ['m', 's']
```

## mayGrant(newPermission [, granteePermissions])

Returns `true` if permission allows granting `newPermission` to grantee.

In the grant process we distinguish two roles:

- *grantor*: the person granting or revoking a permission.
- *grantee*: the person receiving or losing a permission.

To grant a permission the grantor must have **manage** an/or **super** privilege.

- **manage** allows granting or revoking **crud** privileges from anyone without **manage** and **super** privilege.
- **super** allows granting and revoking permissions from anyone.

The grantor/grantee privileges can be customized using `permission.config()`.

```js
import { permission } from 'url-permissions';

permission('/articles:manage').mayGrant('/articles:read', []); // true
permission('/articles:manage').mayGrant('/articles:read', ['/articles:delete']); // true
permission('/articles:manage').mayGrant('/articles:read', ['/articles:super']); // true
permission('/articles:manage').mayGrant('/articles:manage', ['/articles:manage']); // false
permission('/articles:manage').mayGrant('/articles:read', ['/unrelated:super']); // true

permission('/articles:super').mayGrant('/articles/article-1:read', ['/articles:manage']); // true
permission('/articles:super').mayGrant('/articles/article-1:read', ['/articles:super']); // true
```

## mayRevoke(permission [, granteePermissions])

Returns `true` if permission allows revoking `permission` to grantee.



```js
import { permission } from 'url-permissions';

permission('/articles:manage').mayRevoke('/articles:read', []); // true
permission('/articles:manage').mayRevoke('/articles:read', ['/articles:super']); // false
permission('/articles:manage').mayRevoke('/articles:manage', ['/articles:manage']); // false

permission('/articles:super').mayRevoke('/articles/article-1:read', ['/articles:manage']); // true
permission('/articles:super').mayRevoke('/articles/article-1:read', ['/articles:super']); // true
```

## toObject()

Returns an object representation of an URL permission containing three properties: `url`, `attributes` and `actions`.

```js
import { permission } from 'url-permissions';

permission('/articles/*?author=user-1,user-2&flag=true:all').toObject()
// {
//   path: '/articles/*',
//   attributes: {
//     author: ['user-1', 'user-2'],
//     flag: ['true'],
//   },
//   privileges: ['r', 'c', 'u', 'd'],
// }
```

## toString()

Returns a permission string of an URL Permission. Privileges are always represented by privilege identifiers.

```js
import { permission } from 'url-permissions';

permission('/articles/*?author=user-1:all').toString()
// '/articles/*?author=user-1:crud'
```

## clone()

Returns a clone of the permission.

```js
const a = permission('/articles:r');
const b = a.clone();
a.privileges(['u']);
b.privileges(); // ['r']
```

Alternatively you can do this:

```js
const a = permission('/articles:r');
const b = permission(a); // Clone a
```

## validate()

Static method to checks if url permission string is valid.

```js
import { permission } from 'url-permissions';

permission.validate('/articles?author=1,2:all,m'); // true
permission.validate('/articles?author=1,2'); // false, no privileges
permission.validate('/articles:unknown'); // false, unknown privilege/alias
permission.validate('?author=user-1:c'); // false, no path
```

## config(options)

Static method to change global config options. Changing global config doesn't affect existing instances.

```js
import { permission } from 'url-permissions';

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

### Grant privileges

The config option `grantPrivileges` must be an object of key-value pairs where each key is a one-character privilege identifier and each value an array of privileges it is allowed to grant.

Anyone with grant privileges is allowed to grant its privileges to grantees without any grant privileges. However, if a grantee does have grant privileges its grant privileges must be covered by those of the grantor.

Example:

```js
import { permission } from 'url-permissions';

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

# permissions(perms[])

The `permissions(perms[])` function enables verifying a collection of permissions.

Valid `perms` are permission strings, `permission()` objects, or arrays of either of those.

## allows(searchPermissions[])

Returns `true` if all `searchPermissions` are matched by any single or a combination of `permissions`, otherwise returns `false`.

This method intelligently handles combination and products of parameter values and privileges.

```js
import { permissions } from 'url-permissions';

permissions('/articles:r', '/articles:u').allows('/articles:ru'); // true
permissions('/articles/*:r', '/articles/*:u').allows('/articles/article-1:ru'); // true
permissions('/articles?author=user1:r', '/articles?author=user2:r').allows('/articles?author=user1,user2:r'); // true
permissions('/articles?author=user1:r', '/articles?author=user2:u').allows('/articles?author=user1,user2:ru'); // false
```

When using comma-separated parameter values each value should be considered a separate permission that must be allowed:

```js
permissions('/articles?author=user-1:r', '/articles?author=user-2:r')
  .allows('/articles?author=user-1,user-2&status=published:r'); // true

// ... which is equivalent to:
permissions('/articles?author=user-1:r', '/articles?author=user-2:r')
  .allows([
    '/articles?author=user-1&status=published:r',
    '/articles?author=user-2&status=published:r',
  ]);
```

Similarly, multiple parameters and multiple values in a single permission are equivalent to the combination of all possible parameter values:

```js
permissions('/articles?author=user-1:r', '/articles?author=user-2&status=published:r')
  .allows('/articles?author=user-1,user-2&status=published,draft:r'); // false

// ... which is equivalent to:
permissions('/articles?author=user-1:r', '/articles?author=user-2&status=published:r')
  .allows([
    '/articles?author=user-1&status=published:r',
    '/articles?author=user-1&status=draft:r',
    '/articles?author=user-2&status=published:r',
    '/articles?author=user-2&status=draft:r', // This does not match
  ]);
```
