# URL-Based Permissions

This library facilitates formatting permissions for users or groups in the following way:

```
<url>?<attributes>:<actions>
```

Read more about the URL Permission format at [url-permissions](https://github.com/nielskrijger/url-permissions).

### URL

URL-Based Permissions are ideal for REST API's. REST URL's are structured as follows:

```
https://example.com/collection/:resource_id/sub_collection/:sub_resource2
```

For example;

```
https://example.com/articles/article-1/comments/comment-1
```

Some URL permissions that allow a user to read that resource instance are:

```
/articles:read
/articles/*:read
/articles/*/comments/*:read
https://example.com/articles/article-1/comments/comment-1:read
```

Note the subtle difference between `/articles:read` and `/articles/*:read`. Strictly speaking the former grants permission to the articles collection allowing you to read and search all articles, while the latter only allows you to read articles but not access the collection directly.

Replacement variables formatted as `{var}` can be used to apply user-specific attributes in the url. For example:

```
/user/{userId}/emails:read
```

... which grants read access to a user's emails address. Note the `userId` replacement variable must be defined at runtime when evaluating the permission.

### Attributes

Attributes are domain-specific properties that restrict a permission. They are similar to how you'd filter a resource collection, for example:

```
https://newspaper.com/articles?author=user-1
```

... returns newspaper articles written by `user-1`. URL Permission attributes are used in the same way:

```
/articles?author=user-1:all
```

... which grants access to all CRUD operations on articles written by author `user-1`.

```
/articles?author=user-1&status=published:read
```

Grants read access to published articles of `user-1`.

```
/articles/*/comments?article.status=published:read
```

Grants read access to comments of all published articles (but not read the articles themselves).

### Actions

Actions specify which operations are allowed on a resource.

You can fully customize all action names, abbreviations and what they represent. The following is used as default:

Name      | Abbreviation | Description
----------|--------------|-----------------
`read`    |          `r` | View resource.
`create`  |          `c` | Create resource.
`update`  |          `u` | Update resource.
`delete`  |          `d` | Delete resource.
`manage`  |          `m` | Set permissions of users or groups without `manage` or `super` permission for the applicable resource.
`super`   |          `s` | Set permissions of all users and groups for the applicable resource.

In addition to the actions above, the following aliases exist:

Name      | Alias for | Description
----------|-----------|-------------------
`all`     |    `crud` | Allows user to perform the most common actions on a resource apart from changing user or group permissions.
`manager` |   `crudm` | Allows user to perform CRUD operations and set permissions of users without `manager` or `owner` permissions.
`owner`   |   `cruds` | Allows all possible actions on resource.

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
