// build.ts
await Bun.build({
    entrypoints: [
        "src/index.ts",
        "src/controls/index.ts",
        "src/frame/index.ts"
    ],
    outdir: "dist",
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



