// build.ts
import {join} from "path";
import { HYPER_RUNTIME_DIST_FROM_SOURCE } from '@hypertool/shared-config/paths';

const currentDir = join(__dirname, '');

const DIST_TARGET_LOCATION = join(currentDir, HYPER_RUNTIME_DIST_FROM_SOURCE);


// Single unified bundle containing both controls and frame
await Bun.build({
    entrypoints: ["src/index.ts"],
    outdir: 'dist',
    target: "browser",
    format: "esm",
    minify: true,
    sourcemap: "external",
    plugins: [
        {
            name: "css-injector",
            setup(builder) {
                builder.onLoad({ filter: /\.css$/ }, async (args) => {
                    const css = await Bun.file(args.path).text();
                    const escaped = JSON.stringify(css);
                    return {
                        contents: `
              const style = document.createElement('style');
              style.textContent = ${escaped};
              document.head.appendChild(style);
              export default ${escaped};
            `,
                        loader: "js",
                    };
                });
            },
        },
    ],
});



