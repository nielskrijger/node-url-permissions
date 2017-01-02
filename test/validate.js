import { expect } from 'chai';
import { permission } from '../src/index';

describe('validate(...)', function() {
  this.slow(10);

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
