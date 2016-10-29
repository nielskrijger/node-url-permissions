# URL-Based Permissions

This library facilitates formatting permissions for users or groups in the following way:

```
<url>?<attributes>:<actions>
```

An URL Permission consists of three components:

1. **Url**: identifies which resource the permission applies to. Can be an absolute pathname (starting with `/`) or an entire url with domain name and url scheme. Urls can include wildcards `*` and `**` to specify permission over a range of articles.
2. **Attributes**: optional query parameters that apply additional restrictions to the permission. For example, a permission `/articles:read` grants read access to all articles whereas `/articles?author=user-1:read` grants read access only to articles whose author is `user-1`.
3. **Actions**: the actions allowed on the resource. You can either specify these as a comma-separated set of actionnames or their abbreviations (e.g. `create,read,update` vs `cru`).

Some examples:

- `/groups/my-group:read` - grants read access to the group `/groups/my-group`.
- `/articles?author=user1:read,update` - grants read and update access to the articles whose author is `user1`.
- `/**:all` - grants access to all actions for all resources, e.g. an administrator.
- `https://newspaper.com/articles?author=user1:read,update` - grants read and update access to all newspaper articles whose author is `user1`.

URL Based Permissions are intended for web services that:

1. have a REST API of [maturity level 1](http://martinfowler.com/articles/richardsonMaturityModel.html);
2. require permissions to be expressed in a succinct way;
3. require resource owners to grant permissions to other users or groups.

### URL

URL-Based Permissions are ideal for REST API's. REST URL's are structured as follows:

```
https://example.com/collection/:resource_id/sub_collection/:sub_resource2
```

For example;

```
https://example.com/articles/article-1/comments/comment-1
```

Both absolute pathnames and full url's are allowed, whichever you prefer.

Note the subtle difference between `/articles:read` and `/articles/*:read`. Strictly speaking the former grants permission to the articles collection allowing you to read and search all articles, while the latter only allows you to read articles but not access the collection directly.

### Attributes

Attributes are domain-specific properties that restrict the permission. They are similar to how you'd filter a resource collection, for example:

```
https://newspaper.com/articles?author=user-1
```

That URL only returns newspaper articles written by `user-1`. URL Permission attributes are used in the same way:

```
/articles?author=user-1:all
```

Grants access to all CRUD operations on articles written by author `user-1`.

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

Name      | Alias | Description
----------|-------|-----------------
`read`    |   `r` | View resource.
`create`  |   `c` | Create resource.
`update`  |   `u` | Update resource.
`delete`  |   `d` | Delete resource.
`manage`  |   `m` | Set permissions of users or groups without `manage` or `super` permission for the applicable resource.
`super`   |   `s` | Set permissions of all users and groups for the applicable resource.

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
permission       | string    | The required permission to pass authorization.
searchPermission | ...string | The permission strings to check against `permission`. At least one `searchPermission` must match `permission`, otherwise returns false.

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
```

### validate(permission)

Checks if permission string is syntactically correct.

TODO

### config(flagMap)

```js
import permissions from 'url-permission';

permissions.config({
  actions: {
    read: 1,
    create: 2,
    update: 4,
    delete: 8,
    all: 15,
    manager: 16,
    owner: 32,
  },
});
```

## Compared to other access control models

### Role-Based Access Control (RBAC)

[Role-Based Access Control (RBAC)](https://en.wikipedia.org/wiki/Role-based_access_control) is a centrally administered permission system based on roles. Imagine a newspaper website where employees are granted roles such as:

- **writer**: allowed to write articles and submit them to an editor for publication,
- **editor**: allowed to make changes to articles and publish them,
- **graphics_artist**: allowed to change any visual asset.

The main advantage of RBAC is its simplicity, regardless of the number of users there are only a few well-defined roles and granting permissions is simply assigning users their correct roles. Many business applications fit this model well as business processes often have clearly defined roles and responsibilities.

Drawbacks of RBAC are its coarseness and inflexibility. Imagine *writer1* asking *writer2* to review a draft of its article. Drafts are only viewable for authors and editors, there is no clear-cut way to grant `writer2` access to writer1's article using simply roles.

Using URL-Based Permissions this example may be expressed in permissions such as:

- **writer**: `/articles?author=d851lg01:owner`
- **editor**: `/articles:all`
- **graphics_artist**: `/assets:all`
- **writer** granted access to review specific article: `/articles/51gkga94:read,update`
- **public users**: `/articles?status=published:read`

### Discretionary Access Control (DAC)

[Discretionary Access Control (DAC)](https://en.wikipedia.org/wiki/Discretionary_access_control) allows users to set permissions using an Access Control List (ACL) for each resource instance they own. An entry on the ACL contains who is allowed to do what for which resource instance. E.g `john-doe` is allowed to `get,create,update` on resource class `article` with object id `g0qv41fl`.

DAC allows fine-grained access control and enables users to manage permissions themselves rather than a restricted set of privileged administrators. In our newspaper example it is trivial for *writer1* to grant read access to a draft article to *writer2* using DAC.

Compared to RBAC managing permissions for each and every resource instance quickly grows a huge unmanageable permission database and possibly technical performance issues. Often groups or roles are used to improve manageablility when using DAC.

Not only is DAC difficult to manage, it cannot be expressed in authorization grants effectively (for example in OAuth scopes).

### Attribute-Based Access Control (ABAC)

[Attribute-Based Access Control (ABAC)](https://en.wikipedia.org/wiki/Attribute-Based_Access_Control) uses policies to define a set of rules that must apply to get access to a resource. For example `IF user has role "editor" OR user is resource owner THEN allow read/write access`.

In advanced systems such policies are described in a custom [DSL](https://en.wikipedia.org/wiki/Domain-specific_language) allowing great flexibility.

ABAC's flexibility comes at a price of high complexity to the point of frustration (yes [AWS IAM Policies](http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html), I'm looking at you...). Developing your own ABAC DSL can be a huge undertaking.

Many systems require some advanced authorization logic not captured in their main authorization model but express this in code rather than policies.

### The real world

In most web applications a combination of various methods are used to authorize users. In our `newspaper.com` example a pragmatic approach would be to:

- use roles (`editor`, `writer`, ...) to easily centrally administer common permissions of users (RBAC),
- allow `writers` to grant extra permissions to other `writers` for the purpose of reviewing drafts (DAC),
- allow public users to access articles with status `published` only (ABAC-like).

The URL-Based Permission model is an attempt to find a middle-ground in these three models. It however is not a best of breed, most use cases are better served by other access control models. URL-Based Permissions are:

- not as manageable as roles;
- not as fine-grained as an ACL;
- not as flexible as policies.

As a result when using URL-Based Permissions you may find yourself using other models as well. For example, imagine storing a file in a cloud service. The URL permission may look like:

```
/files/logo.png:read,write
```

Say you want to share this file with anonymous users. To model this in your system you might create a group "anonymous" and add the permission `/files/logo.png:read` to that group. However, allowing anyone to add permissions to the group "anonymous" will quickly grow that group's permission list to millions of records creating performance and manageability issues.

Alternatively, you might create an additional resource url `/public/logo.png` acting as a symlink to `/files/logo.png`. This way by granting a group "anonymous" the permission `/public:read` allows anyone to access your publicly shared files. Revoking that access is as simple as removing the symlink. While this works, you might not want to create symlinks like that.

A more simple approach is to add an attribute `public=true|false` to each file record and check programmatically whether a user is granted access or not. To express this in an URL Permission you can use `/files?public=true:read`.

While URL Permissions are flexible, it is likely you will find yourself in a situation where other access control models are easier to implement and maintain.
