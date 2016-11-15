/**
 * Parses * and ** in glob pattern.
 */
export default (pattern) => {
  let result = '';
  let char = '';

  for (let i = 0, len = pattern.length; i < len; i += 1) {
    char = pattern[i];

    switch (char) {
      case '$':
      case '.':
      case '=':
      case '!':
      case '^':
      case '+':
      case '|':
      case '[':
      case ']':
      case '(':
      case ')':
      case '?':
      case '{':
      case '}':
      case '/':
      case '\\':
        result += `\\${char}`; // Escape reserved regex character
        break;
      case '*':
        // A globstar is `abc/**/xyz`, `abc/**`, `**/abc` but not `/a**/`.
        // To determine if it is a ** rather than *, consume all consecutive "*"
        // and find the chars directly before and after '**'
        const prev = pattern[i - 1];
        let multipleStars = false;
        while (pattern[i + 1] === '*') {
          multipleStars = true;
          i += 1;
        }
        const next = pattern[i + 1];
        if (multipleStars && (!prev || prev === '/') && (!next || next === '/')) {
          result += '([^/]*(/|$))*';
          i += 1; // Move past "/"
        } else {
          result += '[^/]*';
        }
        break;
      default:
        result += char;
    }
  }

  // Allow any characters after the url to match
  if (!pattern.endsWith('*')) {
    result += (result.endsWith('/')) ? '(?:.*)?' : '(?:/.*)?';
  }

  return new RegExp('^' + result + '$');
};
