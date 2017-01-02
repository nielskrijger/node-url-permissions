import { expect } from 'chai';
import { permission } from '../src/index';

beforeEach(() => {
  // Reset global config
  permission.config(false);
});

describe('permission', () => {
  describe('constructor()', () => {
    it('should throw error when URL permission is not a string', () => {
      expect((() => permission(false)))
        .to.throw('Permission must be a string');
    });

    it('should throw error when URL permission does not have privileges', () => {
      expect((() => permission('/articles/article-1')))
        .to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should parse an URL permission', () => {
      const obj = permission('/articles/article-1:read,update');
      expect(obj.path()).to.equal('/articles/article-1');
      expect(obj.parameters()).to.equal(null);
      expect(obj.privileges().length).to.equal(2);
      expect(obj.privileges()[0]).to.equal('r');
      expect(obj.privileges()[1]).to.equal('u');
    });

    it('should parse privilege aliases', () => {
      const obj = permission('/articles/article-1:all');
      expect(obj.privileges().length).to.equal(4);
      expect(obj.privileges()[0]).to.equal('c');
      expect(obj.privileges()[1]).to.equal('r');
      expect(obj.privileges()[2]).to.equal('u');
      expect(obj.privileges()[3]).to.equal('d');
    });

    it('should parse privilege identifiers', () => {
      const obj = permission('/articles/article-1:ru,c,delete');
      expect(obj.privileges().length).to.equal(4);
      expect(obj.privileges()[0]).to.equal('r');
      expect(obj.privileges()[1]).to.equal('u');
      expect(obj.privileges()[2]).to.equal('c');
      expect(obj.privileges()[3]).to.equal('d');
    });

    it('should throw an error if privilege is unknown', () => {
      const func = () => permission('/articles/article-1:z');
      expect(func).to.throw('Privilege \'z\' does not exist');
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
      const perm = permission('/articles:r');
      perm.path('/test');
      expect(perm.path()).to.equal('/test');
    });

    it('should throw an error when path is not a string', () => {
      const perm = permission('/articles:r');
      const func = () => perm.path(false);
      expect(func).to.throw('Path must be a string');
    });
  });

  describe('parameters()', () => {
    it('should change permission parameters with an object', () => {
      const perm = permission('/articles?attr1=test,test2&attr2=test3:r');
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
      const perm = permission('/articles?attr1=test,test2&attr2=test3:r');
      perm.parameters('?attr1=test&attr3=test');
      expect(perm.parameters()).to.deep.equal({
        attr1: ['test'],
        attr3: ['test'],
      });
    });

    it('should throw an error when parameters is not an object or string', () => {
      const perm = permission('/articles:r');
      const func = () => perm.parameters(false);
      expect(func).to.throw('Parameters must be an URLPermission object or a permission string');
    });

    it('should throw an error when parameter value is neither string nor array', () => {
      const perm = permission('/articles:r');
      const func = () => perm.parameters({ attr: false });
      expect(func).to.throw('Parameter value must be either a string or an array of strings');
    });
  });

  describe('privileges()', () => {
    it('should change permission privileges with an array', () => {
      const perm = permission('/articles:r');
      perm.privileges(['all', 'm', 'super']);
      expect(perm.privileges()).to.deep.equal(['c', 'r', 'u', 'd', 'm', 's']);
    });

    it('should change permission privileges with a string', () => {
      const perm = permission('/articles:r');
      perm.privileges('all,m,super');
      expect(perm.privileges()).to.deep.equal(['c', 'r', 'u', 'd', 'm', 's']);
    });

    it('should throw an error when privileges is not an array or string', () => {
      const perm = permission('/articles:r');
      const func = () => perm.privileges(false);
      expect(func).to.throw('Privileges must be an array or string');
    });
  });

  describe('grantPrivileges()', () => {
    it('should return privileges that grant permissions', () => {
      const perm = permission('/articles:all,m,s');
      expect(perm.grantPrivileges()).to.deep.equal(['m', 's']);
    });
  });

  describe('allows()', () => {
    it('should allow basic permissions', () => {
      expect(permission('/articles:r').allows('/articles:read')).to.equal(true);
      expect(permission('/articles:read,update').allows('/articles:r')).to.equal(true);
      expect(permission('/articles:read,update').allows('/articles:r,update')).to.equal(true);
      expect(permission('/articles:read,update').allows('/articles:r,all')).to.equal(false);
      expect(permission('/articles:r').allows('/articles/:r')).to.equal(false);
      expect(permission('/articles:read,update').allows('/articles:all')).to.equal(false);
      expect(permission('/articles:all').allows('/articles:read,update')).to.equal(true);
      expect(permission('/articles/article-1/comments/comment-1:r').allows('/articles:read')).to.equal(false);
      expect(permission('/articles/:r').allows('/articles/article-1:read')).to.equal(false);
    });

    it('should allow parameters', () => {
      expect(permission('/articles:r').allows('/articles?author=user-1:r')).to.equal(true);
      expect(permission('/articles?author=user-1:r').allows('/articles:r')).to.equal(false);
      expect(permission('/articles?author=user-1&status=draft:r').allows('/articles?author=user-1:r')).to.equal(false);
      expect(permission('/articles?author=user-1:r').allows('/articles?author=user-1&status=draft:r')).to.equal(true);
      expect(permission('/articles?author=*:r').allows('/articles?author=user-1:r')).to.equal(false); // No wildcards exist
      expect(permission('/articles?author=user-1,user-2:r').allows('/articles?author=user-1:r')).to.equal(true);
      expect(permission('/articles?author=user-1,user-2:r').allows('/articles?author=user-1,user-3:r')).to.equal(false);
      expect(permission('/articles?author=user-1:r').allows('/articles?author=user-1,user-2:r')).to.equal(false);
      expect(permission('/articles?author=user-1,user-2:r').allows('/articles?author=user-1,user-2&status=draft:r')).to.equal(true);
    });

    it('should allow wildcards', () => {
      expect(permission('/articles:r').allows('/art*cles:r')).to.equal(true);
      expect(permission('/artcles:r').allows('/art*cles:r')).to.equal(true);
      expect(permission('/articles/:r').allows('/art*cles:r')).to.equal(false);
      expect(permission('/articles:r').allows('/articles*:r')).to.equal(true);
      expect(permission('/articles?author=user-2:r').allows('/articles/*:r')).to.equal(false);
      expect(permission('/articles:r').allows('/articles/*:r')).to.equal(false);
      expect(permission('/articles/*:r').allows('/articles/article-1:r')).to.equal(true);
      expect(permission('/articles/:r').allows('/articles/article-1/comments:r')).to.equal(false);
      expect(permission('/articles/article-1/comments:r').allows('/articles/**:r')).to.equal(true);
      expect(permission('/articles/article-1/comments:r').allows('/articles/*:r')).to.equal(false);
      expect(permission('/articles/article-1/comments:r').allows('/articles*:r')).to.equal(false);
      expect(permission('/articles/article-1/comments/comment-1:r').allows('/articles/**/comment-1:r')).to.equal(true);
      expect(permission('/articles/article-1/comments/comment-1:r').allows('/articles/**/comments:r')).to.equal(false);
      expect(permission('/articles/article-1/comments:r').allows('/articles/**/comments-1:r')).to.equal(false);
    });

    it('should match multiple permissions', () => {
      expect(permission('/articles:r').allows('/articles:read', '/articles:u')).to.equal(false);
      expect(permission('/articles:owner').allows('/articles:read', '/articles:u')).to.equal(true);
    });
  });

  describe('mayGrant()', () => {
    it('should allow basic grants', () => {
      expect(permission('/articles:s').mayGrant('/articles:r')).to.equal(true);
      expect(permission('/articles:owner').mayGrant('/articles:crud')).to.equal(true);
      expect(permission('/articles:s').mayGrant('/articles:r', ['/articles:d', '/articles:r'])).to.equal(true);
      expect(permission('/articles:m').mayGrant('/articles:r', ['/unrelated:s'])).to.equal(true);
    });

    it('should allow granting with parameters', () => {
      expect(permission('/articles:s').mayGrant('/articles?author=user-1:r')).to.equal(true);
      expect(permission('/articles?author=user-1:s').mayGrant('/articles?author=user-1&foo=bar:r')).to.equal(true);
    });

    it('should allow grant when grant privilege can grant itself', () => {
      expect(permission('/articles:s').mayGrant('/articles:scrud')).to.equal(true);
    });

    it('should not allow grant in basic use cases', () => {
      expect(permission('/articles:s').mayGrant('/articles/1:r')).to.equal(false);
      expect(permission('/articles?author=1:s').mayGrant('/articles?author=2:r')).to.equal(false);
      expect(permission('/articles:r').mayGrant('/articles:r')).to.equal(false);
    });

    it('should not allow grant when permission has lesser or equal grant privileges', () => {
      expect(permission('/articles:cmr').mayGrant('/articles:uds')).to.equal(false);
      expect(permission('/articles:m').mayGrant('/articles:m')).to.equal(false);
    });

    it('should allow grant if user permission has higher grant', () => {
      expect(permission('/articles:m').mayGrant('/articles:r', ['/articles:r', '/articles:m'])).to.equal(true);
    });
  });

  describe('mayRevoke()', () => {
    it('should allow basic revokes', () => {
      expect(permission('/articles:s').mayRevoke('/articles:r')).to.equal(true);
      expect(permission('/articles:owner').mayRevoke('/articles:crud')).to.equal(true);
      expect(permission('/articles:s').mayRevoke('/articles:r', ['/articles:d', '/articles:r'])).to.equal(true);
      expect(permission('/articles:m').mayRevoke('/articles:r', ['/unrelated:s'])).to.equal(true);
    });

    it('should allow revoke with parameters', () => {
      expect(permission('/articles:s').mayRevoke('/articles?author=user-1:r')).to.equal(true);
      expect(permission('/articles?author=user-1:s').mayRevoke('/articles?author=user-1&foo=bar:r')).to.equal(true);
    });

    it('should allow revoke when grant privilege can grant itself', () => {
      expect(permission('/articles:s').mayRevoke('/articles:scrud')).to.equal(true);
    });

    it('should not allow revoke in basic use cases', () => {
      expect(permission('/articles:s').mayGrant('/articles/1:r')).to.equal(false);
      expect(permission('/articles?author=1:s').mayGrant('/articles?author=2:r')).to.equal(false);
      expect(permission('/articles:r').mayGrant('/articles:r')).to.equal(false);
    });

    it('should not allow revoke when permission has lesser or equal grant privileges', () => {
      expect(permission('/articles:cmr').mayRevoke('/articles:uds')).to.equal(false);
      expect(permission('/articles:m').mayRevoke('/articles:m')).to.equal(false);
    });

    it('should not allow revoke if user permission has higher grant', () => {
      expect(permission('/articles:m').mayRevoke('/articles:r', ['/articles:r', '/articles:m'])).to.equal(false);
    });
  });

  describe('clone()', () => {
    it('should make a clone of permission', () => {
      const a = permission('/articles?status=published:m');
      const b = a.clone();
      a.path('/new');
      a.parameters({ status: 'draft' });
      a.privileges(['r']);
      expect(b.path()).to.equal('/articles');
      expect(b.parameters()).to.deep.equal({ status: ['published'] });
      expect(b.privileges()).to.deep.equal(['m']);
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
        privileges: ['c', 'r', 'u', 'd'],
      });
    });
  });

  describe('toString()', () => {
    it('should create string representation of permission', () => {
      const input = '/articles/**/article-1?author=user-1,user-2&flag=1:owner';
      const output = '/articles/**/article-1?author=user-1,user-2&flag=1:cruds';
      expect(permission(input).toString()).to.equal(output);
    });
  });
});
