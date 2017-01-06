import { expect } from 'chai';
import { permissions } from '../src/index';

describe('permissions', function() {
  this.slow(10);

  describe('constructor()', () => {
    it('should throw error when URL permission is not a string', () => {
      const func = () => permissions('/articles:r', { foo: 'bar' });
      expect(func).to.throw('Permission must be a string');
    });

    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('/articles');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });
  });

  describe('allows()', () => {
    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('/articles:r').allows('/articles?author=user1');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should allow basic permissions', () => {
      expect(permissions('/articles:r', '/articles:u').allows('/articles:ru')).to.equal(true);
    });

    it('should allow parameters', () => {
      expect(permissions('/articles:r').allows('/articles?author=user1:r')).to.equal(true);
      expect(permissions('/articles?author=user1:r').allows('/articles:r')).to.equal(false);
      expect(permissions('/articles?author=user1:r').allows('/articles?author=user1:r')).to.equal(true);
      expect(permissions('/articles?author=user1:r', '/articles?author=user2:u').allows('/articles?author=user1,user2:ru')).to.equal(false);
      expect(permissions('/articles?author=user1:ru').allows('/articles?author=user1:r', '/articles?author=user1:u')).to.equal(true);
      expect(permissions('/articles?author=user1,user2:ru').allows('/articles?author=user1,user2:r', '/articles?author=user2:u')).to.equal(true);
    });

    it('should allow wildcards', () => {
      expect(permissions('/articles/*:r', '/articles/*:u').allows('/articles/article-1:ru')).to.equal(true);
      expect(permissions('/articles/*:r', '/articles:u').allows('/articles/article-1:ru')).to.equal(false);
    });

    it('should match multiple permissions', () => {
      expect(permissions('/articles:r', '/articles:u').allows('/articles:ru')).to.equal(true);
      expect(permissions('/articles:r', '/articles:u').allows(['/articles:r', '/articles:u'])).to.equal(true);
      expect(permissions('/articles?author=user1:ru', '/redundant:u').allows('/articles?author=user1:ru')).to.equal(true);
      expect(permissions('/articles?author=user-1:r', '/articles?author=user-2&status=published:r')
        .allows('/articles?author=user-1,user-2&status=published:r')).to.equal(true);
      expect(permissions('/articles?author=user-1:r', '/articles?author=user-2&status=published:r')
        .allows('/articles?author=user-1,user-2&status=draft,published:r')).to.equal(false);
      expect(permissions('/articles?var1=A:r', '/articles?var2=C,D:r')
        .allows('/articles?var1=A,B&var2=C,D&var3=E,F:r')).to.equal(true);
      expect(permissions('/articles?var1=A:r', '/articles?var2=G:r')
        .allows('/articles?var1=A,B&var2=C,D&var3=E,F:r')).to.equal(false);
    });
  });

  describe('mayGrant()', () => {
    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('/articles:r').mayGrant('/articles?author=user1');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should grant basic permissions', () => {
      expect(permissions('/articles:r', '/articles:m').mayGrant('/articles:ru')).to.equal(true);
      expect(permissions('/articles:r', '/articles:u').mayGrant('/articles:ru')).to.equal(false);
    });

    it('should consider grantee permissions', () => {
      expect(permissions('/articles?author=user-1:owner', '/articles?author=user-2:owner')
        .mayGrant('/articles?author=user-1,user-2:read', ['/articles:read'])).to.equal(true);
      expect(permissions('/articles?author=user-1:manage', '/articles?author=user-2:manage')
        .mayGrant('/articles?author=user-1,user-2:read', ['/articles:owner'])).to.equal(false);
    });
  });

  describe('mayRevoke()', () => {
    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('/articles:r').mayGrant('/articles?author=user1');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should grant basic permissions', () => {
      expect(permissions('/articles:r', '/articles:m').mayGrant('/articles:ru')).to.equal(true);
      expect(permissions('/articles:r', '/articles:u').mayGrant('/articles:ru')).to.equal(false);
    });
    
    it('should consider grantee permissions', () => {
      expect(permissions('/articles?author=user-1:owner', '/articles?author=user-2:owner')
        .mayRevoke('/articles?author=user-1,user-2:read', ['/articles:read'])).to.equal(true);
      expect(permissions('/articles?author=user-1:manage', '/articles?author=user-2:manage')
        .mayRevoke('/articles?author=user-1,user-2:read', ['/articles:owner'])).to.equal(false);
    });
  });
});
