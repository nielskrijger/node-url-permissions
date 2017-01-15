import { expect } from 'chai';
import { permission } from '../src/index';

beforeEach(() => {
  // Reset global config
  permission.config(false);
});

describe('permission', function() {
  this.slow(10);

  describe('constructor()', () => {
    it('should throw error when URL permission is not a string', () => {
      expect((() => permission(false)))
        .to.throw('Permission must be a string or URLPermission instance');
    });

    it('should throw error when URL permission does not have privileges', () => {
      expect((() => permission('/articles/article-1')))
        .to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should parse an URL permission', () => {
      const obj = permission('/articles/article-1:read,update');
      expect(obj.path()).to.equal('/articles/article-1');
      expect(obj.parameters()).to.equal(null);
      expect(obj.privileges()).to.equal(5);
    });

    it('should parse privilege aliases', () => {
      const obj = permission('/articles/article-1:crud,own');
      expect(obj.privileges()).to.equal(15 + 32);
    });

    it('should parse privilege bitmask', () => {
      const obj = permission('/articles/article-1:12');
      expect(obj.privileges()).to.equal(12);
    });

    it('should throw an error if privilege is out of bounds', () => {
      const func = () => permission('/articles/article-1:128');
      expect(func).to.throw('Privilege must be a number between 1 and 127');
    });

    it('should parse parameter names', () => {
      const obj = permission('/articles/article-1?attr1=test,test2&attr2=#@%();::read');
      expect(obj.parameters()).to.deep.equal({
        attr1: ['test', 'test2'],
        attr2: ['#@%();:'],
      });
    });
  });

  describe('path()', () => {
    it('should change and return the permission path', () => {
      const perm = permission('/articles:read');
      perm.path('/test');
      expect(perm.path()).to.equal('/test');
    });

    it('should throw an error when path is not a string', () => {
      const perm = permission('/articles:read');
      const func = () => perm.path(false);
      expect(func).to.throw('Path must be a string');
    });
  });

  describe('parameters()', () => {
    it('should change permission parameters with an object', () => {
      const perm = permission('/articles?attr1=test,test2&attr2=test3:read');
      perm.parameters({
        attr1: 'a1,a2',
        attr3: ['a2', 'a3'],
      });
      expect(perm.parameters()).to.deep.equal({
        attr1: ['a1', 'a2'],
        attr3: ['a2', 'a3'],
      });
    });

    it('should change permission parameters with a string', () => {
      const perm = permission('/articles?attr1=test,test2&attr2=test3:read');
      perm.parameters('?attr1=test&attr3=test');
      expect(perm.parameters()).to.deep.equal({
        attr1: ['test'],
        attr3: ['test'],
      });
    });

    it('should throw an error when parameters is not an object or string', () => {
      const perm = permission('/articles:read');
      const func = () => perm.parameters(false);
      expect(func).to.throw('Parameters must be an URLPermission object or a permission string');
    });

    it('should throw an error when parameter value is neither string nor array', () => {
      const perm = permission('/articles:read');
      const func = () => perm.parameters({ attr: false });
      expect(func).to.throw('Parameter value must be either a string or an array of strings');
    });
  });

  describe('privileges()', () => {
    it('should change permission privileges with an array', () => {
      const perm = permission('/articles:read');
      perm.privileges(['crud', 'manage,admin']);
      expect(perm.privileges()).to.equal(15 + 16 + 64);
    });

    it('should change permission privileges with a string', () => {
      const perm = permission('/articles:read');
      perm.privileges('crud,manage,admin');
      expect(perm.privileges()).to.deep.equal(15 + 16 + 64);
    });

    it('should throw an error when privileges is not an array or string', () => {
      const perm = permission('/articles:read');
      const func = () => perm.privileges(false);
      expect(func).to.throw('Privileges must be an array, string or number');
    });
  });

  describe('hasPrivilege', () => {
    it('should verify privilege bitmask', () => {
      expect(permission('/articles:crud').hasPrivilege('1')).to.equal(true);
      expect(permission('/articles:crud').hasPrivilege('1,4')).to.equal(true);
      expect(permission('/articles:crud').hasPrivilege(['1', '8', '12'])).to.equal(true);
      expect(permission('/articles:crud').hasPrivilege(1)).to.equal(true);
    });

    it('should verify privilege names', () => {
      expect(permission('/articles:crud').hasPrivilege('create,read,update,delete')).to.equal(true);
      expect(permission('/articles:crud').hasPrivilege(['read', 'update,delete'])).to.equal(true);
      expect(permission('/articles:crud').hasPrivilege('crud,manage')).to.equal(false);
    });

    it('should verify a combination of bitmask and privilege names', () => {
      expect(permission('/articles:crud').hasPrivilege('1,3,delete')).to.equal(true);
      expect(permission('/articles:crud').hasPrivilege(['1,delete', 3])).to.equal(true);
      expect(permission('/articles:crud').hasPrivilege(['1,own', 3])).to.equal(false);
    });

    it('should throw an error when privilege is not valid', () => {
      const perm = permission('/articles:read');
      const func = () => perm.hasPrivilege(false);
      expect(func).to.throw('Privilege must be an array, string or number');
    });
  });

  describe('hasPrivileges', () => {
    it('should be an alias of `hasPrivilege()`', () => {
      expect(permission('/articles:crud').hasPrivileges(['1,delete', 3])).to.equal(true);
      expect(permission('/articles:crud').hasPrivileges('read,update,delete,15')).to.equal(true);
      expect(permission('/articles:crud').hasPrivileges('16')).to.equal(false);
    });
  });

  describe('grantPrivileges()', () => {
    it('should return the permission\'s privileges which allow granting other privileges', () => {
      expect(permission('/articles:manage,own').grantPrivileges()).to.deep.equal(['manage', 'own']);
      expect(permission('/articles:crud,administrator,manage').grantPrivileges()).to.deep.equal(['manage', 'own', 'admin']);
    });
  });

  describe('grantsAllowed()', () => {
    it('should return bitmask describing which permissions may be granted', () => {
      expect(permission('/articles:manage,own').grantsAllowed()).to.equal(63);
      expect(permission('/articles:crud,admin,manage').grantsAllowed()).to.equal(127);
    });
  });

  describe('allows()', () => {
    it('should throw an error when permission is not a valid URL Permission string or object', () => {
      const perm = permission('/articles:read');
      const func = () => perm.allows('test');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should allow basic permissions', () => {
      expect(permission('/articles:read').allows('/articles:read')).to.equal(true);
      expect(permission('/articles:read,update').allows('/articles:read')).to.equal(true);
      expect(permission('/articles:5').allows('/articles:read,update')).to.equal(true);
      expect(permission('/articles:read,update').allows('/articles:read,crud')).to.equal(false);
      expect(permission('/articles:read').allows('/articles/:read')).to.equal(false);
      expect(permission('/articles:read,update').allows('/articles:crud')).to.equal(false);
      expect(permission('/articles:crud').allows('/articles:read,update')).to.equal(true);
      expect(permission('/articles/article-1/comments/comment-1:read').allows('/articles:read')).to.equal(false);
      expect(permission('/articles/:read').allows('/articles/article-1:read')).to.equal(false);
    });

    it('should allow parameters', () => {
      expect(permission('/articles:1').allows('/articles?author=user-1:1')).to.equal(true);
      expect(permission('/articles?author=user-1:read').allows('/articles:read')).to.equal(false);
      expect(permission('/articles?author=user-1&status=draft:read').allows('/articles?author=user-1:read')).to.equal(false);
      expect(permission('/articles?author=user-1:read').allows('/articles?author=user-1&status=draft:read')).to.equal(true);
      expect(permission('/articles?author=*:read').allows('/articles?author=user-1:read')).to.equal(false); // No wildcards exist
      expect(permission('/articles?author=user-1,user-2:read').allows('/articles?author=user-1:read')).to.equal(true);
      expect(permission('/articles?author=user-1,user-2:read').allows('/articles?author=user-1,user-3:read')).to.equal(false);
      expect(permission('/articles?author=user-1:read').allows('/articles?author=user-1,user-2:read')).to.equal(false);
      expect(permission('/articles?author=user-1,user-2:read').allows('/articles?author=user-1,user-2&status=draft:read')).to.equal(true);
    });

    it('should allow wildcards', () => {
      expect(permission('/articles:1').allows('/art*cles:1')).to.equal(true);
      expect(permission('/artcles:read').allows('/art*cles:read')).to.equal(true);
      expect(permission('/articles/:read').allows('/art*cles:read')).to.equal(false);
      expect(permission('/articles:read').allows('/articles*:read')).to.equal(true);
      expect(permission('/articles?author=user-2:read').allows('/articles/*:read')).to.equal(false);
      expect(permission('/articles:read').allows('/articles/*:read')).to.equal(false);
      expect(permission('/articles/*:read').allows('/articles/article-1:read')).to.equal(true);
      expect(permission('/articles/:read').allows('/articles/article-1/comments:read')).to.equal(false);
      expect(permission('/articles/article-1/comments:read').allows('/articles/*:read')).to.equal(false);
      expect(permission('/articles/article-1/comments:read').allows('/articles*:read')).to.equal(false);
      expect(permission('/articles/article-1/comments/comment-1:read').allows('/articles/**/comment-1:read')).to.equal(true);
      expect(permission('/articles/article-1/comments/comment-1:read').allows('/articles/**/comments:read')).to.equal(false);
      expect(permission('/articles/article-1/comments:read').allows('/articles/**/comments-1:read')).to.equal(false);
    });

    it('should match multiple permissions', () => {
      expect(permission('/articles:read').allows('/articles:read', '/articles:update')).to.equal(false);
      expect(permission('/articles:owner').allows('/articles:read', '/articles:update')).to.equal(true);
      expect(permission('/articles:owner').allows(['/articles:read', '/articles:update'])).to.equal(true);
    });
  });

  describe('mayGrant()', () => {
    it('should allow basic grants', () => {
      expect(permission('/articles:admin').mayGrant('/articles:read')).to.equal(true);
      expect(permission('/articles:owner').mayGrant('/articles:crud')).to.equal(true);
      expect(permission('/articles:admin').mayGrant('/articles:read', ['/articles:delete', '/articles:admin'])).to.equal(true);
      expect(permission('/articles:manage').mayGrant('/articles:read', ['/unrelated:admin'])).to.equal(true);
    });

    it('should allow granting with parameters', () => {
      expect(permission('/articles:admin').mayGrant('/articles?author=user-1:read')).to.equal(true);
      expect(permission('/articles?author=user-1:admin').mayGrant('/articles?author=user-1&foo=bar:read')).to.equal(true);
    });

    it('should allow grant when grant privilege can grant itself', () => {
      expect(permission('/articles:own').mayGrant('/articles:manage,own,crud')).to.equal(true);
      expect(permission('/articles:admin').mayGrant('/articles:admin,crud')).to.equal(true);
    });

    it('should not allow grant in basic use cases', () => {
      expect(permission('/articles:admin').mayGrant('/articles/1:read')).to.equal(false);
      expect(permission('/articles?author=1:admin').mayGrant('/articles?author=2:read')).to.equal(false);
      expect(permission('/articles:read').mayGrant('/articles:read')).to.equal(false);
    });

    it('should not allow grant when permission has lesser or equal grant privileges', () => {
      expect(permission('/articles:crud,manage').mayGrant('/articles:update,delete,admin')).to.equal(false);
      expect(permission('/articles:manage').mayGrant('/articles:manage')).to.equal(false);
      expect(permission('/articles:admin').mayGrant('/articles:manage')).to.equal(true);
      expect(permission('/articles:administrator').mayGrant('/articles:admin')).to.equal(true);
    });

    it('should not allow grant if user has permission with ungrantable privilege', () => {
      expect(permission('/articles:manage').mayGrant('/articles:read', ['/articles:read', '/articles:own'])).to.equal(false);
      expect(permission('/articles:manage').mayGrant('/articles:read', ['/articles:crud', '/articles:manage'])).to.equal(false);
      expect(permission('/articles:manager').mayGrant('/articles:read', ['/articles:admin', '/articles:manage'])).to.equal(false);
    });
  });

  describe('mayRevoke()', () => {
    it('should allow basic grants', () => {
      expect(permission('/articles:admin').mayRevoke('/articles:read')).to.equal(true);
      expect(permission('/articles:owner').mayRevoke('/articles:crud')).to.equal(true);
      expect(permission('/articles:admin').mayRevoke('/articles:read', ['/articles:delete', '/articles:admin'])).to.equal(true);
      expect(permission('/articles:manage').mayRevoke('/articles:read', ['/unrelated:admin'])).to.equal(true);
    });

    it('should allow granting with parameters', () => {
      expect(permission('/articles:admin').mayRevoke('/articles?author=user-1:read')).to.equal(true);
      expect(permission('/articles?author=user-1:admin').mayRevoke('/articles?author=user-1&foo=bar:read')).to.equal(true);
    });

    it('should allow grant when grant privilege can grant itself', () => {
      expect(permission('/articles:own').mayRevoke('/articles:manage,own,crud')).to.equal(true);
      expect(permission('/articles:admin').mayRevoke('/articles:admin,crud')).to.equal(true);
    });

    it('should not allow grant in basic use cases', () => {
      expect(permission('/articles:admin').mayRevoke('/articles/1:read')).to.equal(false);
      expect(permission('/articles?author=1:admin').mayRevoke('/articles?author=2:read')).to.equal(false);
      expect(permission('/articles:read').mayRevoke('/articles:read')).to.equal(false);
    });

    it('should not allow grant when permission has lesser or equal grant privileges', () => {
      expect(permission('/articles:crud,manage').mayRevoke('/articles:update,delete,admin')).to.equal(false);
      expect(permission('/articles:manage').mayRevoke('/articles:manage')).to.equal(false);
      expect(permission('/articles:admin').mayRevoke('/articles:manage')).to.equal(true);
      expect(permission('/articles:administrator').mayRevoke('/articles:admin')).to.equal(true);
    });

    it('should not allow grant if user has permission with ungrantable privilege', () => {
      expect(permission('/articles:manage').mayRevoke('/articles:read', ['/articles:read', '/articles:own'])).to.equal(false);
      expect(permission('/articles:manage').mayRevoke('/articles:read', ['/articles:crud', '/articles:manage'])).to.equal(false);
      expect(permission('/articles:manager').mayRevoke('/articles:read', ['/articles:admin', '/articles:manage'])).to.equal(false);
    });
  });

  describe('clone()', () => {
    it('should make a clone of permission', () => {
      const a = permission('/articles?status=published:manage');
      const b = a.clone();
      a.path('/new');
      a.parameters({ status: 'draft' });
      a.privileges(['read']);
      expect(a.path()).to.equal('/new');
      expect(a.parameters()).to.deep.equal({ status: ['draft'] });
      expect(a.privileges()).to.equal(1);
      expect(b.path()).to.equal('/articles');
      expect(b.parameters()).to.deep.equal({ status: ['published'] });
      expect(b.privileges()).to.equal(16);
    });
  });

  describe('toObject()', () => {
    it('should create object representation of permission', () => {
      expect(permission('/articles/**/article-1?author=user-1,user-2&flag=1:crud').toObject()).to.deep.equal({
        path: '/articles/**/article-1',
        parameters: {
          author: ['user-1', 'user-2'],
          flag: ['1'],
        },
        privileges: 15,
      });
    });
  });

  describe('toString()', () => {
    it('should create string representation of permission', () => {
      const input = '/articles/**/article-1?author=user-1,user-2&flag=1:crud,admin';
      const output = '/articles/**/article-1?author=user-1,user-2&flag=1:79';
      expect(permission(input).toString()).to.equal(output);
    });
  });
});
