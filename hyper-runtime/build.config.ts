// build.ts
import {join} from "path";

const currentDir = join(__dirname, '');

const DIST_TARGET_RELATIVE_LOCATION = '../backend/hyper-runtime';
const DIST_TARGET_LOCATION = join(currentDir, DIST_TARGET_RELATIVE_LOCATION);


await Bun.build({
    entrypoints: [
        "src/index.ts",
        "src/controls/index.ts",
        "src/frame/index.ts"
    ],
    outdir: DIST_TARGET_LOCATION,
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



