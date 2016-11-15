# Node URL-Based Permissions

This Node.js library facilitates formatting permissions for users or groups in the following way:

```
<url>?<attributes>:<actions>
```

URL Permissions are intended to provide authorization for web services that:

1. have a REST API;
2. require permissions to be expressed in a succinct way;
3. have complex authorization requirements.

Read more about the [URL Permission format](https://github.com/nielskrijger/url-permissions).

## Functions

### verify(permission, ...searchPermission)

Returns `true` if at least one `searchPermission` matches `permission`.

Param            | Type      | Description
-----------------|-----------|-------------------
permission       | string    | The required permission.
searchPermission | ...string | One or more permissions to check against. `verify` returns `true` if least one `searchPermission` matches the constraints specified in `permission`, otherwise returns `false`.

```js
import { verify } from 'url-permissions';

// Basic examples
verify('/articles:read', '/articles:read'); // true
verify('/articles:read,update', '/articles:read'); // false
verify('/articles:read,update', '/articles:all'); // true
verify('/articles:read', '/articles:read', '/articles:update'); // true
verify('/articles/article-1:read', '/articles:read'); // true
verify('/articles:read', '/articles/article-1:read'); // false

// Attribute examples
verify('/articles?author=user-1:read', '/articles:read'); // true
verify('/articles?author=user-1&status=draft:read', '/articles?author=user-1:read'); // true
verify('/articles:read', '/articles?author=user-1:read'); // false

// Wildcards * and **
verify('/articles:read', '/art*cles:read'); // true
verify('/articles/article-1:read', '/articles/*:read'); // true
verify('/articles?author=user-2:read', '/articles/*:read'); // false
verify('/articles?author=user-2:read', '/articles/*:read'); // false
verify('/articles:read', '/articles/*:read'); // false
verify('/articles/*:read', '/articles/article-1/comments:read'); // false
verify('/articles/**:read', '/articles/article-1/comments:read'); // true

// Abbreviations and aliases
verify('/articles:crud', '/articles:all'); // true
verify('/articles:all', '/articles:read'); // false
verify('/articles:read', '/articles:all'); // false
```

### config(options)

Example with default config:

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
  aliases: {
    all: 'crud',
    manager: 'crudm',
    owner: 'cruds',
  },
});
```

### parse(permission, [object])

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
