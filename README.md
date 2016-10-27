# URL Based Permissions

This library facilitates formatting permissions for users, groups or roles in the following way:

```
<url>?<attributes>:<action1>,<action2>
```

Some examples:

- `/groups/my-group:read` - grants read access to the group `/groups/my-group`.
- `/articles?author=user1:read,update` - grants read and update access to the articles whose author is `user1`.
- `/**:owner` - grants access to all resources, e.g. an administrator.
- `https://newspaper.com/articles?author=user1:read,update` - grants read and update access to all newspaper articles whose author is `user1`.


URL Based Permissions are intended for web services that:

1. have a REST API of [maturity level 1](http://martinfowler.com/articles/richardsonMaturityModel.html);
2. require permissions to be expressed in a succinct way;
3. require resource owners to grant permissions to other users or groups.

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

In most systems a combination of various methods are used to authorize users. In our example of a newspaper website a pragmatic approach would be to:

- use roles (`editor`, `writer`, ...) to easily centrally administer common permissions of users (RBAC).
- allow `writers` to grant extra permissions to other `writers` for the purpose of reviewing drafts (DAC).
- not allow any public users to read draft articles (ABAC).

The URL-Based Permission model is an attempt to find a middle-ground of these three models. It however is not a best of breed, most use cases are better served by other access control models. URL-Based Permissions are:

- not as manageable as roles;
- not as fine-grained as an ACL;
- not as flexible as policies.

As a result when using URL-Based Permissions you may find yourself using other models as well. For example, imagine storing a file in a cloud service. The URL permission may look like:

```
/files/DfDXj4knrEvetvcA:read,write
```

Say you want to share this file with anonymous users. To model this in your system you might create a group "anonymous" and add the permission `/files/DfDXj4knrEvetvcA:read` to that group. However, allowing anyone to add permissions to the group "anonymous" will quickly grow that group's permission list to millions of records creating performance and manageability issues.

Alternatively, you might create an additional resource url `/public/DfDXj4knrEvetvcA` acting as a symlink to `/files/DfDXj4knrEvetvcA`. This way by granting a group "anonymous" the permission `/public:read` allows anyone to access your publicly shared files. Revoking that access is as simple as removing the symlink. While this works, you might not want to create symlinks like that.

A more simple approach is to add additional attribute `public=true|false` to each database file metarecord and check programmatically whether a user is granted access or not. Using URL Permissions in this scenario you might create a group "anonymous" and grant it the permission `/files?public=true:read`.

While URL Permissions are flexible, it is likely you will find yourself in a situation where other access control models are a better fit.
