# babel-env-var

Inline environment variables (or .env files) at build time

# Quick Start

Add something like this to your babel config:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    plugins: [
      [
        require("babel-env-var"),
        {
          dotEnvDir: path.resolve(__dirname),
          whitelist: ["MY_ENV_VAR"],
          defaults: {
            MY_ENV_VAR: "some important environment variable"
          }
        }
      ]
    ]
  }
};
```

Then in your code:
```javascript
import { MY_ENV_VAR } from "babel-env-var/imports";
console.log(MY_ENV_VAR);
```
