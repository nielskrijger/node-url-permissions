import { expect } from 'chai';
import permission from '../src/index';

beforeEach(() => {
  // Reset global config
  permission.config(false);
});

describe('permission.constructor()', () => {
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
      attr1: 'test',
      attr3: 'test',
    });
    expect(perm.parameters()).to.deep.equal({
      attr1: 'test',
      attr3: 'test',
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
    expect(func).to.throw('Parameters must be an object or string');
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

describe('matches()', () => {
  it('should match basic permissions', () => {
    expect(permission('/articles:r').matches('/articles:read')).to.equal(true);
    expect(permission('/articles:read,update').matches('/articles:r')).to.equal(false);
    expect(permission('/articles:read,update').matches('/articles:r,update')).to.equal(true);
    expect(permission('/articles:read,update').matches('/articles:r,all')).to.equal(true);
    expect(permission('/articles:r').matches('/articles/:r')).to.equal(false);
    expect(permission('/articles:read,update').matches('/articles:all')).to.equal(true);
    expect(permission('/articles:read').matches(['/articles:read', '/articles:update'])).to.equal(true);
    expect(permission('/articles:read').matches(['/articles:delete', '/articles:update'])).to.equal(false);
    expect(permission('/articles:all').matches('/articles:read')).to.equal(false);
    expect(permission('/articles/article-1/comments/comment-1:r').matches('/articles:read')).to.equal(false);
    expect(permission('/articles/:r').matches('/articles/article-1:read')).to.equal(false);
  });

  it('should match parameters', () => {
    expect(permission('/articles?author=user-1:r').matches('/articles:r')).to.equal(true);
    expect(permission('/articles?author=user-1&status=draft:r').matches('/articles?author=user-1:r')).to.equal(true);
    expect(permission('/articles?author=user-1:r').matches('/articles?author=user-1&status=draft:r')).to.equal(false);
    expect(permission('/articles:r').matches('/articles?author=*:r')).to.equal(true);
    expect(permission('/articles:r').matches('/articles?author=user-1:r')).to.equal(false);
    expect(permission('/articles?author=*:r').matches('/articles?author=user-1:r')).to.equal(false);
    expect(permission('/articles?author=user-1,user-2:r').matches('/articles?author=user-1:r')).to.equal(true);
    expect(permission('/articles?author=user-1:r').matches('/articles?author=user-1,user-2:r')).to.equal(true);
  });

  it('should match wildcards', () => {
    expect(permission('/articles:r').matches('/art*cles:r')).to.equal(true);
    expect(permission('/artcles:r').matches('/art*cles:r')).to.equal(true);
    expect(permission('/articles/:r').matches('/art*cles:r')).to.equal(false);
    expect(permission('/articles:r').matches('/articles*:r')).to.equal(true);
    expect(permission('/articles?author=user-2:r').matches('/articles/*:r')).to.equal(false);
    expect(permission('/articles:r').matches('/articles/*:r')).to.equal(false);
    expect(permission('/articles/*:r').matches('/articles/article-1:r')).to.equal(true);
    expect(permission('/articles/:r').matches('/articles/article-1/comments:r')).to.equal(false);
    expect(permission('/articles/article-1/comments:r').matches('/articles/**:r')).to.equal(true);
    expect(permission('/articles/article-1/comments:r').matches('/articles/*:r')).to.equal(false);
    expect(permission('/articles/article-1/comments:r').matches('/articles*:r')).to.equal(false);
    expect(permission('/articles/article-1/comments/comment-1:r').matches('/articles/**/comment-1:r')).to.equal(true);
    expect(permission('/articles/article-1/comments/comment-1:r').matches('/articles/**/comments:r')).to.equal(false);
    expect(permission('/articles/article-1/comments:r').matches('/articles/**/comments-1:r')).to.equal(false);
  });
});

describe('mayGrant()', () => {
  it('should allow standard grants', () => {
    expect(permission('/articles:s').mayGrant('/articles:r')).to.equal(true);
    expect(permission('/articles:s').mayGrant('/articles:r', ['/articles:d', '/articles:r'])).to.equal(true);
    expect(permission('/articles:m').mayGrant('/articles:r', ['/unrelated:s'])).to.equal(true);
  });

  it('should not allow grant when permission does not have grant privileges', () => {
    expect(permission('/articles:r').mayGrant('/articles:r')).to.equal(false);
  });

  it('should not allow grant when permission does match url path', () => {
    expect(permission('/articles:s').mayGrant('/articles/1:r')).to.equal(false);
  });

  it('should not allow grant when permission does match parameters', () => {
    expect(permission('/articles?author=1:s').mayGrant('/articles?author=2:r')).to.equal(false);
  });

  it('should not allow grant when permission has lesser or equal grant privileges', () => {
    expect(permission('/articles:cmr').mayGrant('/articles:uds')).to.equal(false);
    expect(permission('/articles:cmr').mayGrant('/articles:r', ['/articles:uds'])).to.equal(false);
    expect(permission('/articles:m').mayGrant('/articles:m')).to.equal(false);
    expect(permission('/articles:m').mayGrant('/articles:r', ['/articles:m'])).to.equal(false);
  });

  it('should allow grant when grant privilege can grant itself', () => {
    expect(permission('/articles:s').mayGrant('/articles:scrud')).to.equal(true);
  });

  it('should not allow grant if user permission has higher grant', () => {
    expect(permission('/articles:m').mayGrant('/articles:r', ['/articles:r', '/articles:m'])).to.equal(false);
  });
});

describe('mayRevoke()', () => {
  it('should be an alias of mayGrant()', () => {
    expect(permission('/articles:s').mayRevoke('/articles:r')).to.equal(true);
    expect(permission('/articles:s').mayRevoke('/articles:r', ['/articles:d', '/articles:r'])).to.equal(true);
    expect(permission('/articles:m').mayRevoke('/articles:r', ['/unrelated:s'])).to.equal(true);
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

describe('config(...)', () => {
  describe('grant privileges', () => {
    it('should throw an error when grant privileges is not an array', () => {
      const func = () => permission.config({
        grantPrivileges: { a: { c: 't', r: 'r' } },
      });
      expect(func).to.throw(/Privilege 'a' must contain an array/);
    });

    it('should throw an error when grant privilege identifier does not exist', () => {
      const func = () => permission.config({
        grantPrivileges: { all: ['c', 'r', 'u', 'd'] },
      });
      expect(func).to.throw(/Privilege 'all' does not exist/);
    });

    it('should throw an error when grant privilege does not exist', () => {
      const func = () => permission.config({
        grantPrivileges: { m: ['c', 'r', 'u', 'test'] },
      });
      expect(func).to.throw(/Privilege 'test' does not exist/);
    });

    it('should configure all grant privileges', () => {
      permission.config({
        grantPrivileges: { create: ['u', 'read'] },
      });
      expect(permission.config().grantPrivileges).to.deep.equal({ c: ['u', 'r'] });
    });
  });

  describe('privileges', () => {
    it('should throw an error when privileges is not an object', () => {
      const func = () => permission.config({ privileges: ['a'] });
      expect(func).to.throw('Privileges must an object');
    });

    it('should throw an error when privilege identifer contains more than 1 character', () => {
      const func = () => permission.config({ privileges: { abc: 'ef' } });
      expect(func).to.throw('Privilege identifier \'abc\' must be 1 character');
    });

    it('should throw an error when privilege name contains more less than 2 characters', () => {
      const func = () => permission.config({ privileges: { a: 'c' } });
      expect(func).to.throw('Privilege name \'c\' must be at least 2 characters');
    });

    it('should configure privileges globally', () => {
      permission.config({
        privileges: {
          c: 'create',
          r: 'read',
        },
      });
      expect(permission.config().privileges).to.deep.equal({
        c: 'create',
        r: 'read',
      });
      expect(permission('/articles:c').matches('/articles:create')).to.equal(true);
      const func = () => permission('/articles:d').matches('/articles:d');
      expect(func).to.throw(/Privilege 'd' does not exist/);
    });
  });

  describe('aliases', () => {
    it('should throw an error when aliases is not an object', () => {
      const func = () => permission.config({ aliases: ['a'] });
      expect(func).to.throw('Aliases must an object');
    });

    it('should throw an error when alias does not contain an array', () => {
      const func = () => permission.config({ aliases: { test: 'crudf' } });
      expect(func).to.throw('Alias \'test\' must contain an array');
    });

    it('should throw an error when alias contains an unknown privilege', () => {
      const func = () => permission.config({ aliases: { test: ['c', 'r', 'u', 'd', 'f'] } });
      expect(func).to.throw('Alias \'test\' contains unknown privilege identifier \'f\'');
    });

    it('should configure aliases globally', () => {
      permission.config({
        aliases: {
          test1: ['c', 'r'],
          test2: ['r', 'd'],
        },
      });
      expect(permission.config().aliases).to.deep.equal({
        test1: ['c', 'r'],
        test2: ['r', 'd'],
      });
      expect(permission('/articles:test1,test2').matches('/articles:crud')).to.equal(true);
      const func = () => permission('/articles:all').matches('/articles:d');
      expect(func).to.throw(/Privilege 'a' does not exist/);
    });
  });

  it('should not affect existing instances', () => {
    const perm = permission('/articles:all,super');
    permission.config({
      aliases: {
        test1: ['c'],
      },
      privileges: {
        c: 'create',
        r: 'read',
      },
      grantPrivileges: {
        create: ['read'],
      },
    });
    expect(perm.grantPrivileges()).to.deep.equal(['s']);
    expect(perm.privileges()).to.deep.equal(['c', 'r', 'u', 'd', 's']);
    perm.privileges(['manage']);
    expect(perm.privileges()).to.deep.equal(['m']);
  });
});

describe('validate(...)', () => {
  it('should return true when string is valid', () => {
    expect(permission.validate('/articles?author=1,2:all,m')).to.equal(true);
    expect(permission.validate('https://examp.le/articles?author=1,2:all,m')).to.equal(true);
    expect(permission.validate('/articles:crudms')).to.equal(true);
  });

  it('should return false string with global config', () => {
    expect(permission.validate(false)).to.equal(false);
    expect(permission.validate('/articles?author=1,2')).to.equal(false);
    expect(permission.validate('/articles:unknown')).to.equal(false);
    expect(permission.validate('/articles:crudmt')).to.equal(false);
    expect(permission.validate(':c')).to.equal(false);
    expect(permission.validate('?author=user-1:c')).to.equal(false);
  });
});
