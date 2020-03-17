const dotEnv = require("dotenv");
const sysPath = require("path");

const DEFAULT_IMPORT_NAME = "babel-env-var/imports";
const SELF_MODULE_NAME = "babel-env-var";

function loadDotEnvVars(dotEnvDir, dotEnvFile) {
  const dotEnvConfig =
    dotEnv.config({
      path: sysPath.join(dotEnvDir, dotEnvFile),
      silent: true
    }) || {};
  const babelEnvFile =
    process.env.BABEL_ENV === "development" ||
    process.env.BABEL_ENV === undefined
      ? dotEnvFile + ".development"
      : dotEnvFile + ".production";
  const babelEnvConfig = dotEnv.config({
    path: sysPath.join(dotEnvDir, babelEnvFile),
    silent: true
  });

  return Object.assign(dotEnvConfig, babelEnvConfig);
}

function throwIfDefaultOrNamespaceImport(path, specifier, idx) {
  if (
    specifier.type === "ImportDefaultSpecifier" ||
    specifier.type === "ImportNamespaceSpecifier"
  ) {
    throw path
      .get("specifiers")
      [idx].buildCodeFrameError(
        `${specifier.type} from ${SELF_MODULE_NAME} not supported`
      );
  }
}

function throwIfMissing(path, envVars, importedId, idx) {
  if (!envVars.hasOwnProperty(importedId)) {
    throw path
      .get("specifiers")
      [idx].buildCodeFrameError(
        `Tried to import ${importedId} which is not a known environment variable`
      );
  }
}

function throwIfNotWhitelisted(path, whitelist, importedId, idx) {
  if (whitelist && !whitelist.includes(importedId)) {
    throw path
      .get("specifiers")
      [idx].buildCodeFrameError(
        `Tried to import ${importedId} which is not included in the whitelist.`
      );
  }
}

function createHandleImportDeclaration(types) {
  return function handleImportDeclaration(path, state) {
    const options = state.opts;

    const replacedModuleName =
      options.replacedModuleName || DEFAULT_IMPORT_NAME;

    const dotEnvDir = options.dotEnvDir || "./";
    const dotEnvFile = options.filename || ".env";
    const whitelist = options.whitelist;

    const defaultEnvVars = options.defaults || {};
    const dotEnvVars = loadDotEnvVars(dotEnvDir, dotEnvFile);
    const processEnvVars = process.env;

    const envVars = Object.assign(defaultEnvVars, dotEnvVars, processEnvVars);

    if (path.node.source.value === replacedModuleName) {
      path.node.specifiers.forEach(function(specifier, idx) {
        throwIfDefaultOrNamespaceImport(path, specifier, idx);

        const importedId = specifier.imported.name;
        const localId = specifier.local.name;

        throwIfMissing(path, envVars, importedId, idx);
        throwIfNotWhitelisted(path, whitelist, importedId, idx);

        const binding = path.scope.getBinding(localId);
        binding.referencePaths.forEach(function(refPath) {
          refPath.replaceWith(types.valueToNode(envVars[importedId]));
        });
      });

      path.remove();
    }
  };
}

module.exports = function(data) {
  const t = data.types;

  return {
    visitor: {
      ImportDeclaration: createHandleImportDeclaration(t)
    }
  };
};
