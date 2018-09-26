# hana-xsa-apm-itelo-node

## Changes from Default Template

The folder structure and templates have been initialized with `@sap/generator-cds` using the command `cds-gen new hana-xsa-apm-itelo-node`:
- Selected `a` for all modules
- Selected `Node.js`

The generated template files have been modified/replaced:
- Used an extended `.gitignore` generated by GitHub
- Changed the modules names at `mta.yml` as `db` and `srv` where already in use at the test spaces


### Dependencies
#### Design Time
- `/package.json`
  - Reuse of Java Itelo OData v4 `"hana-xsa-apm-itelo"` model
  - Code linting with `standard`
- `/srv/package.json`
  - Testing with `jest`, `jest-junit`, `supertest` `sqlite3`
  - Code linting with `standard`


## Notes

### Linking and Building Models
- `db/model.cds` reuses `cloud-samples-itelo`
- `srv/itelo-service` uses `db/model.cds`
- Nothing added or annotated
- Run `npm run build` at root to generate `db/src/gen/*.hdbcds` and collect sources into `srv/gen/csn.json`


### Language Features
One should understand [destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) before reading the examples.
Nearly every handler is making use of this feature where instead of:
```javascript
const fn = (arr, obj) => {
  const a = arr[0]
  const b = arr[1]
  const c = obj.c
  // ...
}

fn([10, 20, 30, 40, 50], {c: 1}) 
```

Following syntax is used:
```javascript
const fn = ([a, b], {c}) => {
  // ...
}

fn([10, 20, 30, 40, 50], {c: 1}) 
```