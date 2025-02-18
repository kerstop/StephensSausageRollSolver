
set shell := ["powershell"]

[working-directory: 'frontend']
fr: build-bindings
  npm run dev
  
[working-directory: 'frontend']
publish: build-bindings
  npm run build
  npx gh-pages -d dist

build-bindings:
  wasm-pack build
