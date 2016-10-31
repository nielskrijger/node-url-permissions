# URL-Based Permissions

This library facilitates formatting permissions for users or groups in the following way:

```
<url>?<attributes>:<actions>
```

Read more about the URL Permission format at [url-permissions](https://github.com/nielskrijger/url-permissions).

## Functions

### verify(permission, ...searchPermission)

Returns `true` if at least one `searchPermission` matches `permission`.

Param            | Type      | Description
-----------------|-----------|-------------------
permission       | string    | The required permission.
searchPermission | ...string | One or more permissions to check against. `verify` returns `true` if least one `searchPermission` matches the constraints specified in `permission`, otherwise returns `false`.
replacementVars  | object    | Object containing replacement variables for `permission` and `searchPermission` parameters.

```js
import { verify } from 'url-permissions';

// Basic examples
verify('/articles:read', '/articles:read'); // true
verify('/articles:read,update', '/articles:read'); // false
verify('/articles:read,update', '/articles:all'); // true
verify('/articles:read', '/articles:read', '/articles:update'); // true
verify('/articles:all', '/articles:read'); // false

// Attribute examples
verify('/articles?author=user-1:read', '/articles:read'); // Returns true
verify('/articles?author=user-1&status=draft:read', '/articles?author=user-1:read'); // Returns true
verify('/articles:read', '/articles?author=user-1:read'); // Returns false

// Wildcards * and **
verify('/art*les:read', '/articles:read'); // Returns true
verify('/articles/*:read', '/articles/article-1:read'); // Returns true
verify('/articles/*:read', '/articles?author=user-2:read'); // Returns false
verify('/articles:read', '/articles/*:read'); // Returns false
verify('/articles/*:read', '/articles/article-1/comments:read'); // Returns false
verify('/articles/**:read', '/articles/article-1/comments:read'); // Returns true

// Replacement variables
verify('/users/{userId}:read', '/users/{userId}:read', { userId: 'test' }); // Returns true
verify('/users/{userId}:read', '/users/{userId}:read'); // Throws error
verify('/articles?author={userId}:read', '/articles:read', { userId: 'test' }); // Returns true
verify('/articles:read', '/articles?author={userId}:read', { userId: 'test' }); // Returns false
```

### validate(permission)

Checks if permission string is syntactically correct.

TODO

### config(options)

```js
import permissions from 'url-permission';

permissions.config({
  actions: {
    read: 'r',
    create: 'c',
    update: 'u',
    delete: 'd',
    super: 's',
    manage: 'm',
  },
  alias: {
    all: 'crud',
    manager: 'crudm',
    owner: 'cruds',
  },
});
```

### parse(permission[, object])

This method takes an URL Permission string, parses it, and returns an URL object.

```js
// Example `parse('/articles/*?author={author}:all', { author: 'user-1' })`
{
  url: '/articles/gd235lkg91'
  actions: ['read', 'create', 'update', 'delete'],
  attributes: {
    author: 'user-1',
  }
}
```
