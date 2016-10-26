# URL Based Permissions

This library facilitates formatting permissions for users, groups or roles in the following way:

```
<url>?<attributes>:<action1>,<action2>
```

Example:

- `/groups/my-group:read`: grants read access to the group `/groups/my-group`.
- `/articles?author=user1:read,update`: grants read and update permissions to all articles whose author is `user1`.

URL Based Permissions are intended for web services that:

1. have a REST API of [maturity level 1](http://martinfowler.com/articles/richardsonMaturityModel.html);
2. require permissions to be expressed in a succinct way;
3. require resource owners to grant permissions to any other users/groups.

The URL Based Permission model was designed to act as a universal permission model for Users, Groups, Roles and OAuth Scopes.

## Role-Based Access Control (RBAC)

Role-Based Access Control (RBAC) is a centrally administered permission system based on roles. Imagine a newspaper website where employees are granted roles such as:

- **writer**: allowed to write articles and submit them to the editor for publication.
- **editor**: allowed to make changes to articles and publish them.
- **graphics_artist**: allowed to change any visual asset.

The main advantage of RBAC is its simplicity, regardless of the number of users there are only a few roles and granting permissions is simply assigning users their correct roles.

A common issue with RBAC is its coarseness; there is little flexibility. Imagine a `writer` wanting another `writer` to review a draft and freely edit its article before publication. Because RBAC is centrally administered such a permission grant is often not possible.

URL Permissions for this example may look as follows:

- **writer**: `/articles?author=d851lg01:owner`
- **editor**: `/articles:all`
- **graphics_artist**: `/assets:all`
- **writer** granted access to review specific: `/articles/51gkga94:read,update`

## Discretionary Access Control (DAC)

Discretionary Access Control (DAC) allows users to set permissions using an Access Control List (ACL) for each resource instance they own. An entry on the ACL contains who is allowed to do what for which resource instance. E.g `john-doe` is allowed to `get,create,update` on resource `article#123`.

DAC allows more fine-grained access control compared to RBAC and allows users to manage permissions rather than a restricted set of privileged administrators.

Compared to RBAC managing permissions for each and every resource instance quickly grows a huge permission database and possibly performance issues. Usually groups or roles are used to manage permissions for multiple users at the same time but even so the ACL database grows to millions of record quickly.

RBAC is much more difficult to manage and cannot be expressed in simple authorization grants efficiently.

## Attribute-Based Access Control (ABAC)

Attribute-Based Access Control (ABAC) utilizes the use of policies defining a set of rules that must apply to get access. For example `IF user has role "editor" OR user is resource owner THEN allow read/write access`.

In advanced systems such policies are described in a custom [DSL](https://en.wikipedia.org/wiki/Domain-specific_language) allowing great flexibility.

ABAC's flexibility comes at a price of high complexity to the point of frustration (yes [AWS IAM Policies](http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html), I'm looking at you...).

## The real world

In practice most systems use a combination of various methods to express their authorize users. Using our newspaper website example a pragmatic approach would be to:

- Use roles (`editor`, `writer`, ...) to easily centrally administer permissions of users (RBAC).
- Allow `writers` to grant extra permissions to other `writers` for the purpose of reviewing drafts (DAC).
- Do not allow any public users to read draft articles (ABAC).

The URL Based Permission model is an attempt to find a middle-ground of these three models. It however is not a best of breed, the vast majority of use cases are better served by other access control models. URL Based Permissions are:

- not as readable or expressive as RBAC;
- not as fine-grained as DAC;
- not as flexible as ADAC.
