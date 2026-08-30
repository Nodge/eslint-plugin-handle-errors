import { defineConfig } from 'tsdown';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    // Only the JS sourcemaps are useful: they inline sourcesContent, while
    // declaration maps would point at a src directory the package does not ship.
    // tsdown writes a sourceMappingURL comment into the declarations regardless
    // (`dts.sourcemap` is ignored), so those references dangle.
    sourcemap: true,
    clean: true,
    define: {
        __PLUGIN_VERSION__: JSON.stringify(pkg.version),
    },
});
