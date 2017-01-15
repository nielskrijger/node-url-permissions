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
    /articles?author=user-1,user-2&status=published:read
    ```

    ... which allows read access of published articles whose author is `user-1` or `user-2` (comma-separated values are evaluated as OR).

3. **Privileges**. Privileges specify which operations are allowed on the resource. You can either specify these as a comma-separated set of names, a bitmask, or a combination thereof (e.g. `create,read,update,delete`, `15` and `crud` are equivalent). Privileges are fully customizable. The default are:

    Bitmask | Name            | Description
    --------|-----------------|-----------------
    `1`     | `read`          | View resource.
    `2`     | `create`        | Create resource.
    `4`     | `update`        | Update resource.
    `8`     | `delete`        | Delete resource.
    `15`    | `crud`          | All of the above.
    `16`    | `manage`        | Set permissions of subject without `manage` or `super` privilege.
    `31`    | `manager`       | All of the above.
    `32`    | `own`           | Set permissions of subjects without `super` privilege + allow ownership transfer.
    `63`    | `owner`         | All of the above.
    `64`    | `admin`         | Enables special administrative actions and setting permissions of everyone.
    `127`   | `administrator` | All of the above.

# permission(perm)

The `permission(perm)` function enables a variety of evaluation and transformation methods. To evaluate a collection of permissions scroll down until you hit the `permissions(perms[])` section.

## allows(searchPermissions[])

Returns `true` if all `searchPermissions` are matched by the permission, otherwise returns `false`.

```js
import { permission } from 'url-permissions';

// Basic examples
permission('/articles:read').allows('/articles:read'); // true
permission('/articles:read,update').allows('/articles:read'); // true
permission('/articles:crud').allows('/articles:read,update'); // false
permission('/articles:read,update').allows('/articles:crud'); // false
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
permission('/articles:crud').allows('/articles:crud'); // true
permission('/articles:crud').allows('/articles:read'); // false
permission('/articles:read').allows('/articles:crud'); // false
```

## path([ path ])

Gets or sets the permission path.

```js
const perm = permission('/articles:read');

perm.path(); // "/articles"
perm.path('/users');
perm.path(); // "/users"
```

## parameters([ parameters ])

Gets or sets the permission parameters.

```js
const perm = permission('/articles?attr1=test:read');

perm.parameters(); // { attr1: 'test' }
perm.parameters({ attr1: 'test2', attr2: 'test3' });
perm.parameters(); // { attr1: 'test2', attr2: 'test3' }
```

## privileges([ privileges ])

Sets or returns priviliges

`privileges` can be either an array or comma-separated string with privilege names or their bitmasks. For example, `13`, `read`, `owner`, and `read,update,3` are valid.

When `privileges` are not defined method returns the bitmask of all privileges.

```js
const perm = permission('/articles:read');

perm.privileges(); // 1
perm.privileges('crud,own');
perm.privileges(); // 15 | 32 = 47
perm.privileges(['crud', 'manage', 'owner']);
perm.privileges(); // 15 | 16 | 63 = 63
```

## hasPrivilege(privilege)

Return `true` when permission has specified privilege(s).

`privileges` can be either an array or comma-separated string with privilege names or their bitmasks.

```js
const perm = permission('/articles:crud');

perm.hasPrivilege('read'); // true
perm.hasPrivilege(['read', 'create', 'update']); // true
perm.hasPrivilege('crud'); // true
perm.hasPrivilege('crud,read,create'); // true
perm.hasPrivilege('admin'); // false
perm.hasPrivilege('unknown'); // throws error
```

## hasPrivileges()

Alias of `hasPrivilege()`.

## grantPrivileges()

Gets array with privilege names that enable granting privileges. Returns empty array when none of permission's privileges are grant privileges.

```js
const perm = permission('/articles:read,manage,64');

perm.grantPrivileges(); // ['manage', 'admin']
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
permission('/articles:manage').mayGrant('/articles:read', ['/articles:admin']); // true
permission('/articles:manage').mayGrant('/articles:manage', ['/articles:manage']); // false
permission('/articles:manage').mayGrant('/articles:read', ['/unrelated:admin']); // true

permission('/articles:admin').mayGrant('/articles/article-1:read', ['/articles:manage']); // true
permission('/articles:admin').mayGrant('/articles/article-1:read', ['/articles:admin']); // true
```

## mayRevoke(permission [, granteePermissions])

Returns `true` if permission allows revoking `permission` to grantee.



```js
import { permission } from 'url-permissions';

permission('/articles:manage').mayRevoke('/articles:read', []); // true
permission('/articles:manage').mayRevoke('/articles:read', ['/articles:admin']); // false
permission('/articles:manage').mayRevoke('/articles:manage', ['/articles:manage']); // false

permission('/articles:admin').mayRevoke('/articles/article-1:read', ['/articles:manage']); // true
permission('/articles:admin').mayRevoke('/articles/article-1:read', ['/articles:admin']); // true
```

## toObject()

Returns an object representation of an URL permission containing three properties: `url`, `attributes` and `privileges`.

```js
import { permission } from 'url-permissions';

permission('/articles/*?author=user-1,user-2&flag=true:crud').toObject()
// {
//   path: '/articles/*',
//   attributes: {
//     author: ['user-1', 'user-2'],
//     flag: ['true'],
//   },
//   privileges: 15,
// }
```

## toString()

Returns a string representation of an URL Permission. Privileges are always represented by their bitmask.

```js
import { permission } from 'url-permissions';

permission('/articles/*?author=user-1:crud').toString()
// '/articles/*?author=user-1:15'
```

## clone()

Returns a clone of the permission.

```js
const a = permission('/articles:read');
const b = a.clone();
a.privileges(['u']);
b.privileges(); // ['r']
```

Alternatively you can do this:

```js
const a = permission('/articles:read');
const b = permission(a); // Clone a
```

## validate()

Static method to checks if url permission string is valid.

```js
import { permission } from 'url-permissions';

permission.validate('/articles?author=1,2:crud,manage'); // true
permission.validate('/articles?author=1,2'); // false, no privileges
permission.validate('/articles:unknown'); // false, unknown privilege
permission.validate('?author=user-1:create'); // false, no path
```

## config(options)

Static method to change global config options. Changing global config doesn't affect existing instances.

```js
import { permission } from 'url-permissions';

permission.config({
  privileges: {
    read: 1,
    create: 2,
    update: 4,
    delete: 8,
    crud: 15,
    manage: 16,
    manager: 31,
    own: 32,
    owner: 63,
    super: 64,
    admin: 127,
  },
  grantPrivileges: {
    manage: 15, // crud
    owner: 63, // owner + all the rest
    super: 127, // admin
  },
});
```

### Grant privileges

The config option `grantPrivileges` must be an object of key-value pairs where each key is a privilege name and each value a bitmask specifying which privileges it is allowed to grant.

Anyone with grant privileges is allowed to grant its privileges to grantees without any grant privileges. However, if a grantee does have grant privileges its grant privileges must be covered by those of the grantor.

Example:

```js
import { permission } from 'url-permissions';

permission.config({
  privileges: {
    a: 1,
    x: 2,
    y: 4,
    z: 8,
  },
  grantPrivileges: {
    x: 1,
    y: 3, // 1 | 2 => a and x are allowed
    z: 9, // 1 | 8 => a and z are allowed
  },
});

permission('/articles:x').mayGrant('/articles:a'); // true
permission('/articles:x').mayGrant('/articles:a', ['/articles:x']); // false
permission('/articles:y').mayGrant('/articles:a', ['/articles:x']); // true
permission('/articles:y').mayGrant('/articles:x', ['/articles:x']); // true
permission('/articles:y').mayGrant('/articles:a', ['/articles:y']); // false
permission('/articles:z').mayGrant('/articles:a', ['/articles:z']); // true
```

Notice the last example where `z` may grant a permission to a grantee with `z`, whereas an `y` may not grant the same permission to another `y`. We'll leave it to you to figure out why.

# permissions(perms)

The `permissions(perms)` function enables verifying a collection of permissions.

Valid `perms` are permission strings, `permission()` objects, or arrays of either of those.

## allows(searchPermissions[])

Returns `true` if all `searchPermissions` are matched by any single or a combination of `permissions`.

This method intelligently handles combination and products of parameter values and privileges.

```js
import { permissions } from 'url-permissions';

permissions('/articles:read', '/articles:update').allows('/articles:ru'); // true
permissions('/articles/*:read', '/articles/*:update').allows('/articles/article-1:ru'); // true
permissions('/articles?author=user1:read', '/articles?author=user2:read')
  .allows('/articles?author=user1,user2:read'); // true
permissions('/articles?author=user1:read', '/articles?author=user2:update')
  .allows('/articles?author=user1,user2:read,update'); // false
```

When using comma-separated parameter values each value should be considered a separate permission that must be allowed:

```js
permissions('/articles?author=user-1:read', '/articles?author=user-2:read')
  .allows('/articles?author=user-1,user-2&status=published:read'); // true

// ... is equivalent to:
permissions('/articles?author=user-1:read', '/articles?author=user-2:read')
  .allows([
    '/articles?author=user-1&status=published:read',
    '/articles?author=user-2&status=published:read',
  ]);
```

## mayGrant(newPermission [, granteePermissions])

Returns `true` if any or a combination of this collection's permissions allow granting `newPermission` to grantee.

For a better understanding of how granting work, see `permission().mayGrant(...)`.

```js
import { permissions } from 'url-permissions';

permission('/articles:read', '/articles:m').mayGrant('/articles:read'); // true

permissions('/articles?author=user-1:owner', '/articles?author=user-2:owner')
  .mayGrant('/articles?author=user-1,user-2:read', ['/articles:read']); // true

permissions('/articles?author=user-1:manage', '/articles?author=user-2:manage')
  .mayGrant('/articles?author=user-1,user-2:read', ['/articles:owner']); // false
```

## mayRevoke(removePermission [, granteePermissions])

An alias of `permissions().mayGrant()`.

Returns `true` if any or a combination of this collection's permissions allow revoking `removePermission` from grantee.

## permissions([ permissions ])

Gets or sets permissions.

`permissions` can be either a string or an array of permissions.
