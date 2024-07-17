const fs = require("fs/promises");

const report = async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Path to report file not passed");
  }
  const fileContent = await fs.readFile(filePath);
  const report = JSON.parse(fileContent);

  if (
    report.metadata.vulnerabilities.high > 0 ||
    report.metadata.vulnerabilities.critical > 0
  ) {
    throw new Error(
      "High and/or critical vulnerabilities found in dependencies. Run npm audit and resolve them."
    );
  }
  console.log("No high or critical vulnerabilities found!");
};

report();
