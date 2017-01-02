import { expect } from 'chai';
import { permission } from '../src/index';

beforeEach(() => {
  // Reset global config
  permission.config(false);
});

describe('config(...)', function() {
  this.slow(10);
  
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
      expect(permission('/articles:c').allows('/articles:create')).to.equal(true);
      const func = () => permission('/articles:d').allows('/articles:d');
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
      expect(permission('/articles:test1,test2').allows('/articles:cd')).to.equal(true);
      const func = () => permission('/articles:all').allows('/articles:d');
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
