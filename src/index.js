import _ from 'lodash';
import globToRegex from './globToRegex';

const defaultConfig = {
  actions: {
    read: 'r',
    create: 'c',
    update: 'u',
    delete: 'd',
    super: 's',
    manage: 'm',
  },
  aliases: {
    all: 'crud',
    manager: 'crudm',
    owner: 'cruds',
  },
};

// Contains parsed config options for performance
let cfg = null;
let actions = null;
let aliases = null;
let abbreviations = null;

/**
 * Parses an URL permission action string.
 *
 * A single URL permission string is either one or more abbreviations, an alias
 * or a full action name.
 *
 * For example, `ru`, `read` and `owner` are valid actions, whereas
 * `read,update` is not.
 */
function parseAction(action) {
  // Action is not an abbreviation or alias, simply return it.
  if (actions.includes(action)) {
    return action;
  }

  // An alias always overrides any abreviations
  let abbr = action;
  if (aliases.includes(action)) {
    abbr = cfg.aliases[action];
  }

  // Parse abbreviations
  const result = [];
  for (let i = 0; i < abbr.length; i += 1) {
    if (!abbreviations[abbr.charAt(i)]) {
      throw new Error(`Action '${abbr.charAt(i)}' does not exist`);
    }
    result.push(abbreviations[abbr.charAt(i)]);
  }

  return result;
}

/**
 * Parses URL Permission action string.
 */
function parseActions(actionString) {
  return _.flatten(actionString.split(',').map(parseAction));
}

/**
 * Parses URL Permission attributes string.
 */
function parseAttributes(attributesString) {
  const pieces = attributesString.split('&');
  const result = {};
  for (const piece of pieces) {
    const [key, value] = piece.split('=');
    result[key] = value.split(',');
  }
  return result;
}

/**
 * Parses an URL Permission and returns an object with all URL Permission properties.
 */
export function parse(permission) {
  const result = {
    url: null,
    attributes: null,
    actions: [],
  };

  // Determine url and actions
  const delimiterIndex = permission.lastIndexOf(':');
  if (delimiterIndex === -1) {
    throw new Error('Permission must have at least 1 action delimited by ":"');
  }
  result.url = permission.substring(0, delimiterIndex);
  result.actions = parseActions(permission.substring(delimiterIndex + 1));

  // Parse query parameters
  const questionIndex = result.url.indexOf('?');
  if (questionIndex > -1) {
    result.attributes = parseAttributes(result.url.substring(questionIndex + 1));
    result.url = result.url.substring(0, questionIndex);
  }

  return result;
}

/**
 * Matches permission actions of `requiredActions` with `userActions`.
 *
 * Returns `true` if all of `requiredActions` are covered by `userActions`,
 * otherwise returns `false`.
 */
function matchActions(requiredActions, userActions) {
  return _.every(requiredActions, action => userActions.includes(action));
}

/**
 * Matches user attributes with those of required attributes.
 *
 * Returns `true` if all of `userAttrs` are covered by `requiredAttrs`,
 * otherwise returns `false`.
 */
function matchAttributes(requiredAttrs, userAttrs) {
  // If user has no attributes it means he is granted all possible attributes
  if (!userAttrs) return true;

  for (const key in userAttrs) {
    // If required attribute does not exist then user attributes must contain
    // a wildcard.
    if (!requiredAttrs || !requiredAttrs[key]) {
      return userAttrs[key].includes('*');
    }

    // If any user attribute is not covered by required attributes then
    // return false.
    const isCovered = _.some(userAttrs[key], (userAttr) => {
      return requiredAttrs[key].includes(userAttr);
    });
    if (!isCovered) return false;
  }
  return true;
}

/**
 * Returns `true` if at least one `userPermissions` matches `requiredPermission`.
 *
 * `userPermissions` may contain wildcards * and **, whereas `requiredPermission`
 * may not.
 */
export function verify(requiredPermission, ...userPermissions) {
  const required = parse(requiredPermission);
  const permissions = userPermissions.map(parse);

  for (const permission of permissions) {
    const isMatch = globToRegex(permission.url).test(required.url) &&
      matchActions(required.actions, permission.actions) &&
      matchAttributes(required.attributes, permission.attributes);

    // When there is a match return immediately; just 1 user permission has to match
    if (isMatch) {
      return true;
    }
  }
  return false;
}

/**
 * Validates configuration.
 *
 * Throws error when configuration option is invalid.
 */
export function validateConfig(options) {
  for (const key in options.actions) {
    if (options.actions[key].length > 1) {
      throw new Error(`Abbreviation '${options.actions[key]}' contains more than 1 character`);
    }
    if (key.length === 1) {
      throw new Error(`Action '${key}' must be longer than 1 character`);
    }
  }

  const abbrs = _.values(options.actions);
  for (const key in options.aliases) {
    const alias = options.aliases[key];
    for (let i = 0, max = alias.length; i < max; i += 1) {
      if (!abbrs.includes(alias.charAt(i))) {
        throw new Error(`Alias '${key}' contains unknown abbreviation '${alias.charAt(i)}'`);
      }
    }
  }
  return true;
}

/**
 * Sets configuration settings.
 */
export function config(options) {
  const newConfig = Object.assign({}, defaultConfig, options);
  validateConfig(newConfig);

  // Set config helper variables
  cfg = newConfig;
  actions = Object.keys(newConfig.actions);
  aliases = Object.keys(newConfig.aliases);

  // Object.values is an ES 2017 spec; too drafty for now
  abbreviations = {};
  for (const action of actions) {
    abbreviations[newConfig.actions[action]] = action;
  }
}

config(); // Load default config
