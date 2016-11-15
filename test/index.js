import { expect } from 'chai';
import { parse, verify, validateConfig } from '../src/index';

describe('parse()', () => {
  it('should throw error when URL permission does not have actions', () => {
    expect((() => parse('/articles/article-1'))).to.throw('Permission must have at least 1 action delimited by ":"');
  });

  it('should parse an URL permission', () => {
    const obj = parse('/articles/article-1:read,update');
    expect(obj.url).to.equal('/articles/article-1');
    expect(obj.attributes).to.equal(null);
    expect(obj.actions.length).to.equal(2);
    expect(obj.actions[0]).to.equal('read');
    expect(obj.actions[1]).to.equal('update');
  });

  it('should parse attribute aliases', () => {
    const obj = parse('/articles/article-1:all');
    expect(obj.actions.length).to.equal(4);
    expect(obj.actions[0]).to.equal('create');
    expect(obj.actions[1]).to.equal('read');
    expect(obj.actions[2]).to.equal('update');
    expect(obj.actions[3]).to.equal('delete');
  });

  it('should parse attribute abbreviations', () => {
    const obj = parse('/articles/article-1:ru,c,delete');
    expect(obj.actions.length).to.equal(4);
    expect(obj.actions[0]).to.equal('read');
    expect(obj.actions[1]).to.equal('update');
    expect(obj.actions[2]).to.equal('create');
    expect(obj.actions[3]).to.equal('delete');
  });

  it('should throw an error if action is invalid', () => {
    const func = () => parse('/articles/article-1:z');
    expect(func).to.throw('Action \'z\' does not exist');
  });

  it('should parse attribute names', () => {
    const obj = parse('/articles/article-1?attr1=test,test2&attr2=#@%();::read');
    expect(obj.attributes).to.deep.equal({
      attr1: ['test', 'test2'],
      attr2: ['#@%();:'],
    });
  });
});

describe('verify()', () => {
  it('should match basic permissions', () => {
    expect(verify('/articles:r', '/articles:read')).to.equal(true);
    expect(verify('/articles:read,update', '/articles:r')).to.equal(false);
    expect(verify('/articles:read,update', '/articles:r,update')).to.equal(true);
    expect(verify('/articles:read,update', '/articles:r,all')).to.equal(true);
    expect(verify('/articles:r', '/articles/:r')).to.equal(false);
    expect(verify('/articles:read,update', '/articles:all')).to.equal(true);
    expect(verify('/articles:read', '/articles:read', '/articles:update')).to.equal(true);
    expect(verify('/articles:all', '/articles:read')).to.equal(false);
    expect(verify('/articles/article-1/comments/comment-1:r', '/articles:read')).to.equal(true);
    expect(verify('/articles/article-1/comments/comment-1:r', '/articles/:read')).to.equal(true);
    expect(verify('/articles/:r', '/articles/article-1:read')).to.equal(false);
  });

  it('should match attributes', () => {
    expect(verify('/articles?author=user-1:r', '/articles:r')).to.equal(true);
    expect(verify('/articles?author=user-1&status=draft:r', '/articles?author=user-1:r')).to.equal(true);
    expect(verify('/articles?author=user-1:r', '/articles?author=user-1&status=draft:r')).to.equal(false);
    expect(verify('/articles:r', '/articles?author=*:r')).to.equal(true);
    expect(verify('/articles:r', '/articles?author=user-1:r')).to.equal(false);
    expect(verify('/articles?author=*:r', '/articles?author=user-1:r')).to.equal(false);
    expect(verify('/articles?author=user-1,user-2:r', '/articles?author=user-1:r')).to.equal(true);
    expect(verify('/articles?author=user-1:r', '/articles?author=user-1,user-2:r')).to.equal(true);
  });

  it('should match wildcards', () => {
    expect(verify('/articles:r', '/art*cles:r')).to.equal(true);
    expect(verify('/artcles:r', '/art*cles:r')).to.equal(true);
    expect(verify('/articles/:r', '/art*cles:r')).to.equal(true);
    expect(verify('/articles:r', '/articles*:r')).to.equal(true);
    expect(verify('/articles?author=user-2:r', '/articles/*:r')).to.equal(false);
    expect(verify('/articles:r', '/articles/*:r')).to.equal(false);
    expect(verify('/articles/:r', '/articles/article-1/comments:r')).to.equal(false);
    expect(verify('/articles/article-1/comments:r', '/articles/**:r')).to.equal(true);
    expect(verify('/articles/article-1/comments:r', '/articles/*:r')).to.equal(false);
    expect(verify('/articles/article-1/comments:r', '/articles*:r')).to.equal(false);
    expect(verify('/articles/article-1/comments/comment-1:r', '/articles/**/comment-1:r')).to.equal(true);
    expect(verify('/articles/article-1/comments/comment-1:r', '/articles/**/comments:r')).to.equal(true);
    expect(verify('/articles/article-1/comments:r', '/articles/**/comments-1:r')).to.equal(false);
  });
});

describe('validateConfig()', () => {
  it('should require actions abbreviations to have length 1', () => {
    const func = () => validateConfig({
      actions: { test: 't', test2: 't2' },
    });
    expect(func).to.throw(/Abbreviation 't2' contains more than 1 character/);
  });

  it('should require actions to have length > 1', () => {
    const func = () => validateConfig({
      actions: { test: 't', r: 'r' },
    });
    expect(func).to.throw(/Action 'r' must be longer than 1 character/);
  });

  it('should require all aliases to contain valid abbreviations', () => {
    const func = () => validateConfig({
      actions: { test: 't' },
      aliases: { alias1: 't', alias2: 'tu' },
    });
    expect(func).to.throw(/Alias 'alias2' contains unknown abbreviation 'u'/);
  });
});
