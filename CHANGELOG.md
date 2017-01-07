# Change Log
All notable changes to this project will be documented in this file.

## [1.1.0] - 2016-01-07
### Added
- `permission().hasPrivilege()` method
- `permission().hasPrivileges()` alias

## [1.0.0] - 2016-01-07
### Fixed
- Fix parameters being validated in the wrong order
- `parameters()` now processes `{ attr: 'value1,value2' }` into `{ attr: ['value1', 'value2' ]}` rather than `{ attr: 'value1,value2' }`

### Changed
- Refactored test files setup
- Refactor `export default permission` to `export { permission }`
- Changed "slow" test indicator from default to 10ms
- `permission()` constructor now accepts an URLPermission object and clones it
- `mayRevoke()` is now yet again an alias of `mayGrant()`.
- `mayGrant()` no longer allows users with higher privileges to grant permissions.

### Added
- `permissions()` function and companion class `URLPermissions` evaluate a collection of permissions
- `permission().clone()` method

## [0.4.0] - 2016-12-30
### Fixed
- Fixed basic permissions being incorrectly allowed, e.g. `/articles:read,update` would "allow" `/articles:all`.

### Changed
- `allows()` now accepts permissions as varargs.
- `allows()` now evaluates permissions as AND rather than OR.

### Added
- Add `toString()` method.

## [0.3.0] - 2016-12-30
### Changed
- Renamed `matches()` to `allows()`

## [0.2.0] - 2016-12-27
### Changed
- `mayGrant()` now allows granting basic privileges (crud) to anyone.
- `mayRevoke()` is no longer an alias of `mayGrant()` and does not allow revoking basic privileges (crud) from anyone with a “manage” or “super” privilege

## [0.1.1] - 2016-12-26
### Changed
- URL Permission constructor throws error when input is not a string.

### Fixed
- Fixed bug where missing parameters yield `false` rather than `true` for matchers

## [0.1.0] - 2016-12-22
### Added
- `validate()` method

## [0.0.2] - 2016-12-17
Complete rewrite.

### Added
- `config()` method
- `matches()` method
- `mayGrant()` method

## [0.0.1] - 2016-11-15
### Added
- `verify()` method
- `parse()` method
- `config()` method
