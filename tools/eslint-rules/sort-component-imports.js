/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Sort imports array inside Angular @Component alphabetically',
    },
    fixable: 'code',
    schema: [],
    messages: {
      sort: 'Sort @Component imports alphabetically.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    function getPropertyName(property) {
      if (property.type !== 'Property') {
        return null;
      }

      if (property.key.type === 'Identifier') {
        return property.key.name;
      }

      if (property.key.type === 'Literal') {
        return property.key.value;
      }

      return null;
    }

    function getElementName(element) {
      if (!element) return null;

      if (element.type === 'SpreadElement') {
        return null;
      }

      if (element.type === 'Identifier') {
        return element.name;
      }

      // Fallback cho các biểu thức khác.
      return sourceCode.getText(element);
    }

    function checkComponent(node) {
      const decorators = node.decorators ?? [];

      for (const decorator of decorators) {
        if (decorator.expression.type !== 'CallExpression') {
          continue;
        }

        const call = decorator.expression;

        if (call.callee.type !== 'Identifier' || call.callee.name !== 'Component') {
          continue;
        }

        const options = call.arguments[0];

        if (!options || options.type !== 'ObjectExpression') {
          continue;
        }

        const importsProperty = options.properties.find((property) => getPropertyName(property) === 'imports');

        if (
          !importsProperty ||
          importsProperty.type !== 'Property' ||
          importsProperty.value.type !== 'ArrayExpression'
        ) {
          continue;
        }

        const array = importsProperty.value;
        const elements = array.elements.filter(Boolean);

        const sorted = [...elements].sort((a, b) => {
          // Spread luôn đứng cuối.
          if (a.type === 'SpreadElement') return 1;
          if (b.type === 'SpreadElement') return -1;

          return getElementName(a).localeCompare(getElementName(b), 'en', { sensitivity: 'base' });
        });

        const unchanged = elements.every((element, index) => element === sorted[index]);

        if (unchanged) continue;

        context.report({
          node: array,
          messageId: 'sort',
          fix(fixer) {
            const arrayText = sourceCode.getText(array);
            const firstBracket = arrayText.indexOf('[');
            const lastBracket = arrayText.lastIndexOf(']');

            const innerText = arrayText.slice(firstBracket + 1, lastBracket);

            // Giữ nguyên nếu có comment bên trong mảng,
            // tránh làm sai vị trí comment khi sắp xếp.
            if (/\/[/*]/.test(innerText)) {
              return null;
            }

            const firstElement = elements[0];

            if (!firstElement) return null;

            const line = sourceCode.lines[firstElement.loc.start.line - 1];

            const indent = line.match(/^\s*/)?.[0] ?? '';
            const itemIndent = indent;
            const closingIndent = indent.slice(0, -2);

            const content = sorted.map((element) => sourceCode.getText(element)).join(',\n' + itemIndent);

            const replacement = '[\n' + itemIndent + content + ',\n' + closingIndent + ']';

            return fixer.replaceText(array, replacement);
          },
        });
      }
    }

    return {
      ClassDeclaration: checkComponent,
    };
  },
};
