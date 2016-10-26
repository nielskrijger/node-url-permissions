# URL Based Permissions

This library facilitates formatting permissions for users, groups or roles in the following way:

```
<url>?<attributes>:<action1>,<action2>
```

Examples:

- `/groups/my-group:read`: grants read access to the group `/groups/my-group`.
- `https://newspaper.com/articles/articles?author=user1:read,update`: grants read and update permissions to all newspaper articles whose author is `user1`.


URL Based Permissions are intended for web services that:

1. have a REST API of [maturity level 1](http://martinfowler.com/articles/richardsonMaturityModel.html);
2. require permissions to be expressed in a succinct way;
3. require resource owners to grant permissions to other users or groups.

## Compared to other access control models

### Role-Based Access Control (RBAC)

[Role-Based Access Control (RBAC)](https://en.wikipedia.org/wiki/Role-based_access_control) is a centrally administered permission system based on roles. Imagine a newspaper website where employees are granted roles such as:

- **writer**: allowed to write articles and submit them to an editor for publication.
- **editor**: allowed to make changes to articles and publish them.
- **graphics_artist**: allowed to change any visual asset.

The main advantage of RBAC is its simplicity, regardless of the number of users there are only a few roles and granting permissions is simply assigning users their correct roles. Mature business applications usually fit this model well as most business processes have clearly defined roles and responsibilities.

Drawbacks of RBAC are its coarseness and inflexibility. Imagine a `writer` wanting another `writer` to review a draft of its article. Because RBAC is centrally administered such a permission grant is often not possible.

Compared to URL-Based Permissions this example may be expressed in permissions as follows:

- **writer**: `/articles?author=d851lg01:owner`
- **editor**: `/articles:all`
- **graphics_artist**: `/assets:all`
- **writer** granted access to review specific article: `/articles/51gkga94:read,update`

### Discretionary Access Control (DAC)

[Discretionary Access Control (DAC)](https://en.wikipedia.org/wiki/Discretionary_access_control) allows users to set permissions using an Access Control List (ACL) for each resource instance they own. An entry on the ACL contains who is allowed to do what for which resource instance. E.g `john-doe` is allowed to `get,create,update` on resource class `article` with object id `g0qv41fl`.

DAC allows fine-grained access control and allows users to manage permissions themselves rather than a restricted set of privileged administrators.

Compared to RBAC managing permissions for each and every resource instance quickly grows a huge permission database and possibly technical performance issues. Usually groups or roles are used to manage permissions for multiple users at the but even so an ACL database grows to millions of record quickly.

Not only is DAC difficult to manage, it cannot be expressed in authorization grants efficiently (for example in OAuth scopes).

### Attribute-Based Access Control (ABAC)

[Attribute-Based Access Control (ABAC)](https://en.wikipedia.org/wiki/Attribute-Based_Access_Control) uses policies to define a set of rules that must apply to get access to the resource. For example `IF user has role "editor" OR user is resource owner THEN allow read/write access`.

In advanced systems such policies are described in a custom [DSL](https://en.wikipedia.org/wiki/Domain-specific_language) allowing great flexibility.

ABAC's flexibility comes at a price of high complexity to the point of frustration (yes [AWS IAM Policies](http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html), I'm looking at you...).

### The real world

In practice most systems use a combination of various methods to authorize users. In our example of a newspaper website a pragmatic approach would be to:

- use roles (`editor`, `writer`, ...) to easily centrally administer common permissions of users (RBAC).
- allow `writers` to grant extra permissions to other `writers` for the purpose of reviewing drafts (DAC).
- not allow any public users to read draft articles (ABAC).

The URL-Based Permission model is an attempt to find a middle-ground of these three models. It however is not a best of breed, the vast majority of use cases are better served by other access control models. URL-Based Permissions are:

- not as readable or expressive as RBAC;
- not as fine-grained as DAC;
- not as flexible as ADAC.

Even when using URL-Based Permissions you may find yourself using other models as well. For example, imagine storing a file in a cloud service. The URL permission may look like:

```
/files/DfDXj4knrEvetvcA:read,write
```

Say you want to share this file with anonymous users. To model this in your system you might create a group or role "anonymous" and add the permission `/files/DfDXj4knrEvetvcA:read` to that group/role. However, allowing anyone to add permissions to the group "anonymous" will quickly grow that group's permission list to millions of records creating performance and manageability issues.

Alternatively, you might create an additional resource url `/public/DfDXj4knrEvetvcA` acting as a symlink to `/files/DfDXj4knrEvetvcA`. This way by granting a group/role "anonymous" the permission `/public:read` allows anyone to access your publicly shared files. While this works great, you might not want to create symlinks like that.

Ignoring URL-Based Permissions entirely, you might just add an additional attribute `public=true|false` to each database file metarecord and check programmatically whether a user is granted access or not (ADAC). Using URL Permissions in this scenario you might create a group "anonymous" and grant it the permission `/files?public=true:read`.
