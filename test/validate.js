import { expect } from 'chai';
import { permission } from '../src/index';

describe('validate(...)', function() {
  this.slow(10);

  it('should return true when string is valid', () => {
    expect(permission.validate('/articles?author=1,2:crud,manage')).to.equal(true);
    expect(permission.validate('https://examp.le/articles?author=1,2:crud,manage')).to.equal(true);
    expect(permission.validate('/articles:crud,manage,admin')).to.equal(true);
  });

  it('should return false string with global config', () => {
    expect(permission.validate(false)).to.equal(false);
    expect(permission.validate('/articles?author=1,2')).to.equal(false);
    expect(permission.validate('/articles:unknown')).to.equal(false);
    expect(permission.validate('/articles:crudmanage')).to.equal(false);
    expect(permission.validate(':create')).to.equal(false);
    expect(permission.validate('?author=user-1:create')).to.equal(false);
  });
});
