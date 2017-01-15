import { expect } from 'chai';
import { permissions } from '../src/index';

describe('permissions', function() {
  this.slow(10);

  describe('constructor()', () => {
    it('should throw error when URL permission is not a string', () => {
      const func = () => permissions('/articles:read', { foo: 'bar' });
      expect(func).to.throw('Permission must be a string');
    });

    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('/articles');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });
  });

  describe('allows()', () => {
    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('/articles:read').allows('/articles?author=user1');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should allow basic permissions', () => {
      expect(permissions('/articles:read', '/articles:update').allows('/articles:read,update')).to.equal(true);
    });

    it('should allow parameters', () => {
      expect(permissions('/articles:read').allows('/articles?author=user1:read')).to.equal(true);
      expect(permissions('/articles?author=user1:read').allows('/articles:read')).to.equal(false);
      expect(permissions('/articles?author=user1:read').allows('/articles?author=user1:read')).to.equal(true);
      expect(permissions('/articles?author=user1:read', '/articles?author=user2:update').allows('/articles?author=user1,user2:read,update')).to.equal(false);
      expect(permissions('/articles?author=user1:read,update').allows('/articles?author=user1:read', '/articles?author=user1:update')).to.equal(true);
      expect(permissions('/articles?author=user1,user2:read,update').allows('/articles?author=user1,user2:read', '/articles?author=user2:update')).to.equal(true);
    });

    it('should allow wildcards', () => {
      expect(permissions('/articles/*:read', '/articles/*:update').allows('/articles/article-1:read,update')).to.equal(true);
      expect(permissions('/articles/*:read', '/articles:update').allows('/articles/article-1:read,update')).to.equal(false);
    });

    it('should match multiple permissions', () => {
      expect(permissions('/articles:read', '/articles:update').allows('/articles:read,update')).to.equal(true);
      expect(permissions('/articles:read', '/articles:update').allows(['/articles:read', '/articles:update'])).to.equal(true);
      expect(permissions('/articles?author=user1:read,update', '/redundant:update').allows('/articles?author=user1:read,update')).to.equal(true);
      expect(permissions('/articles?author=user-1:read', '/articles?author=user-2&status=published:read')
        .allows('/articles?author=user-1,user-2&status=published:read')).to.equal(true);
      expect(permissions('/articles?author=user-1:read', '/articles?author=user-2&status=published:read')
        .allows('/articles?author=user-1,user-2&status=draft,published:read')).to.equal(false);
      expect(permissions('/articles?var1=A:read', '/articles?var2=C,D:read')
        .allows('/articles?var1=A,B&var2=C,D&var3=E,F:read')).to.equal(true);
      expect(permissions('/articles?var1=A:read', '/articles?var2=G:read')
        .allows('/articles?var1=A,B&var2=C,D&var3=E,F:read')).to.equal(false);
    });
  });

  describe('mayGrant()', () => {
    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('/articles:read').mayGrant('/articles?author=user1');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should grant basic permissions', () => {
      expect(permissions('/articles:read', '/articles:manage').mayGrant('/articles:read,update')).to.equal(true);
      expect(permissions('/articles:read', '/articles:update').mayGrant('/articles:read,update')).to.equal(false);
    });

    it('should consider grantee permissions', () => {
      expect(permissions('/articles?author=user-1:owner', '/articles?author=user-2:owner')
        .mayGrant('/articles?author=user-1,user-2:read', ['/articles:read'])).to.equal(true);
      expect(permissions('/articles?author=user-1:manage', '/articles?author=user-2:manage')
        .mayGrant('/articles?author=user-1,user-2:read', ['/articles:owner'])).to.equal(false);
      expect(permissions('/articles?author=user-1:manage', '/articles?author=user-2:manage')
        .mayGrant('/articles?author=user-1,user-2:read', ['/articles:manage'])).to.equal(false);
    });
  });

  describe('mayRevoke()', () => {
    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('/articles:read').mayGrant('/articles?author=user1');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should grant basic permissions', () => {
      expect(permissions('/articles:read', '/articles:manage').mayGrant('/articles:read,update')).to.equal(true);
      expect(permissions('/articles:read', '/articles:update').mayGrant('/articles:read,update')).to.equal(false);
    });

    it('should consider grantee permissions', () => {
      expect(permissions('/articles?author=user-1:owner', '/articles?author=user-2:owner')
        .mayRevoke('/articles?author=user-1,user-2:read', ['/articles:read'])).to.equal(true);
      expect(permissions('/articles?author=user-1:manage', '/articles?author=user-2:manage')
        .mayRevoke('/articles?author=user-1,user-2:read', ['/articles:owner'])).to.equal(false);
      expect(permissions('/articles?author=user-1:manage', '/articles?author=user-2:manage')
        .mayRevoke('/articles?author=user-1,user-2:read', ['/articles:manage'])).to.equal(false);
    });
  });
});
