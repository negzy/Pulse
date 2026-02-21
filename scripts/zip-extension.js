/**
 * Creates public/extension.zip from the extension folder so the site can offer a download link.
 * Run: npm run extension:zip
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const extensionDir = path.join(root, "extension");
const outZip = path.join(root, "public", "extension.zip");

if (!fs.existsSync(extensionDir)) {
  console.error("extension/ folder not found");
  process.exit(1);
}
if (!fs.existsSync(path.join(root, "public"))) {
  fs.mkdirSync(path.join(root, "public"), { recursive: true });
}

try {
  execSync(
    `cd "${root}" && zip -r public/extension.zip extension -x "*.DS_Store"`,
    { stdio: "inherit" }
  );
  console.log("Created public/extension.zip");
} catch (e) {
  console.error("Zip failed. On Windows you may need to use 7-Zip or add zip to PATH.");
  process.exit(1);
}
