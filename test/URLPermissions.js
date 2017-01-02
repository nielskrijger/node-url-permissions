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
    it('should allow basic permissions', () => {
      expect(permissions('/articles:r', '/articles:u').allows('/articles:ru')).to.equal(true);
    });

    it('should allow parameters', () => {
      expect(permissions('/articles:r').allows('/articles?author=user1:r')).to.equal(true);
      expect(permissions('/articles?author=user1:r').allows('/articles:r')).to.equal(false);
      expect(permissions('/articles?author=user1:r').allows('/articles?author=user1:r')).to.equal(true);
      expect(permissions('/articles?author=user1:r', '/articles?author=user2:u').allows('/articles?author=user1,user2:ru')).to.equal(false);
      expect(permissions('/articles?author=user1:ru').allows('/articles?author=user1:r', '/articles?author=user1:u')).to.equal(true);
      expect(permissions('/articles?author=user1,user2:ru').allows('/articles?author=user1:r', '/articles?author=user2:u')).to.equal(true);
    });

    it('should allow wildcards', () => {
      // TODO
    });

    it('should match multiple permissions', () => {
      expect(permissions('/articles?author=user1:ru', '/redundant:u').allows('/articles?author=user1:ru')).to.equal(true);
      expect(permissions('/articles?var1=foo1:r', '/articles?var2=foo3,foo4:r')
        .allows('/articles?var1=foo1,foo2&var2=foo3,foo4&var3=foo5,foo6:r')).to.equal(true);
    });
  });
});
