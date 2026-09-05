// @ts-check

import prettier from 'prettier';

/** @type {import('eslint-doc-generator').GenerateOptions} */
export default {
    ruleDocTitleFormat: 'name',
    // The generator writes its own markdown tables and never reads the Prettier config, so the two
    // disagree on the width of emoji columns. Formatting the output keeps `--check` and `ci:fmt` in sync.
    postprocess: async (content, path) =>
        prettier.format(content, { ...(await prettier.resolveConfig(path, { editorconfig: true })), filepath: path }),
};
