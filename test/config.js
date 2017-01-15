import { expect } from 'chai';
import { permission } from '../src/index';

beforeEach(() => {
  // Reset global config
  permission.config(false);
});

describe('config(...)', function() {
  this.slow(10);

  describe('grant privileges', () => {
    it('should throw an error when grant privileges is not an object', () => {
      const func = () => permission.config({
        grantPrivileges: { a: { c: 't', r: 'r' } },
      });
      expect(func).to.throw('Grant privilege \'a\' must specify a valid number');
    });

    it('should throw an error when grant privilege identifier does not exist', () => {
      const func = () => permission.config({
        grantPrivileges: { all: ['c', 'r', 'u', 'd'] },
      });
      expect(func).to.throw('Grant privilege \'all\' must specify a valid number');
    });

    it('should configure all grant privileges', () => {
      permission.config({
        grantPrivileges: { create: 5 },
      });
      expect(permission.config().grantPrivileges).to.deep.equal({ create: 5 });
    });
  });

  describe('privileges', () => {
    it('should throw an error when privileges is not an object', () => {
      const func = () => permission.config({ privileges: ['a'] });
      expect(func).to.throw('Privileges must an object');
    });

    it('should throw an error when privilege does not specify a number', () => {
      const func = () => permission.config({ privileges: { abc: 'ef' } });
      expect(func).to.throw('Privilege identifier \'abc\' must be a number');
    });

    it('should configure privileges globally', () => {
      permission.config({
        privileges: {
          read: 1,
          create: 2,
        },
      });
      expect(permission.config().privileges).to.deep.equal({
        read: 1,
        create: 2,
      });
      expect(permission('/articles:2').allows('/articles:create')).to.equal(true);
      const func = () => permission('/articles:delete').allows('/articles:delete');
      expect(func).to.throw(/Privilege 'delete' does not exist/);
    });
  });

  it('should not affect existing instances', () => {
    const perm = permission('/articles:crud,admin');
    permission.config({
      privileges: {
        read: 1,
        create: 2,
      },
      grantPrivileges: {
        create: 3,
      },
    });
    expect(perm.grantPrivileges()).to.deep.equal(['admin']);
    expect(perm.grantsAllowed()).to.equal(127);
    expect(perm.privileges()).to.deep.equal(15 + 64);
    perm.privileges(16);
    expect(perm.privileges()).to.deep.equal(16);
  });
});
