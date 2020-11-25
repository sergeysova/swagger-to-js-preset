const changeCase = require('change-case');
const generate = require('@babel/generator').default;
const template = require('@babel/template').default;
const t = require('@babel/types');

const create = {
  object(schema) {
    return t.callExpression(
      t.memberExpression(t.identifier('typed'), t.identifier('object')),
      [
        t.objectExpression(
          Object.keys(schema.properties).map((name) =>
            t.objectProperty(
              t.identifier(name),
              createContract(
                schema.properties[name],
                (schema.required || []).includes(name),
              ),
            ),
          ),
        ),
      ],
    );
  },
  string(schema) {
    if (schema.enum) {
      return t.callExpression(
        t.memberExpression(t.identifier('typed'), t.identifier('union')),
        schema.enum.map((variant) => t.stringLiteral(variant)),
      );
    }
    return t.memberExpression(t.identifier('typed'), t.identifier('string'));
  },
  number(schema) {
    return t.memberExpression(t.identifier('typed'), t.identifier('number'));
  },
  integer(schema) {
    return create.number(schema);
  },
  boolean(schema) {
    return t.memberExpression(t.identifier('typed'), t.identifier('boolean'));
  },
  array(schema) {
    return t.callExpression(
      t.memberExpression(t.identifier('typed'), t.identifier('array')),
      [createContract(schema.items)],
    );
  },
};

function oneOf(variants) {
  return t.callExpression(
    t.memberExpression(t.identifier('typed'), t.identifier('union')),
    variants.map((schema) => createContract(schema)),
  );
}

function anyOf(variants) {
  console.warn('anyOf is not supported');
  return oneOf(variants);
}

function allOf(variants) {
  console.warn('allOf is not supported');
  return oneOf(variants);
}

function createContract(schema, required = true) {
  if (schema.oneOf) return oneOf(schema.oneOf);
  if (schema.anyOf) return anyOf(schema.anyOf);
  if (schema.allOf) return allOf(schema.allOf);

  const creator = create[schema.type];
  if (!creator) {
    throw new Error(`type "${schema.type}" is not supported`);
  }
  let ast = creator(schema);

  if (schema.nullable) {
    ast = t.memberExpression(ast, t.identifier('maybe'));
  } else if (!required) {
    ast = t.memberExpression(ast, t.identifier('optional'));
  }
  return ast;
}

module.exports = { createContract };
