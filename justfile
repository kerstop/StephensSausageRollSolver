
set shell := ["powershell"]

[working-directory: 'frontend']
fr: build-bindings
  npm run dev
  
build-bindings:
  wasm-pack build
