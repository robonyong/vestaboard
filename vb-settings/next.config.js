const withTM = require("next-transpile-modules")(["@vestaboard/installables"]); // pass the modules you would like to see transpiled

module.exports = withTM({
  output: "standalone",
});
