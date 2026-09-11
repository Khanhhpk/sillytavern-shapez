#!/usr/bin/env node

/**
 * SillyTavern Shapez Side Game - Codebase Integrity & Verification Suite
 * Standalone test runner with zero external dependencies.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT_DIR = path.resolve(__dirname, "..");
let totalErrors = 0;
let totalWarnings = 0;
let totalChecks = 0;

const COLORS = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    dim: "\x1b[2m"
};

function logHeader(title) {
    console.log(`\n${COLORS.bright}${COLORS.cyan}=== [${title}] ===${COLORS.reset}`);
}

function pass(msg) {
    totalChecks++;
    console.log(`  ${COLORS.green}✔ PASS:${COLORS.reset} ${msg}`);
}

function fail(msg, err) {
    totalChecks++;
    totalErrors++;
    console.error(`  ${COLORS.red}✖ FAIL:${COLORS.reset} ${msg}`);
    if (err) {
        console.error(`    ${COLORS.red}↳ ${err.message || err}${COLORS.reset}`);
    }
}

function _warn(msg) {
    totalWarnings++;
    console.warn(`  ${COLORS.yellow}⚠ WARN:${COLORS.reset} ${msg}`);
}

/**
 * 1. Validate Extension Manifest
 */
function checkManifest() {
    logHeader("1. Manifest Verification (manifest.json)");
    const manifestPath = path.join(ROOT_DIR, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
        return fail("manifest.json exists in root directory");
    }

    let manifest;
    try {
        const raw = fs.readFileSync(manifestPath, "utf8");
        manifest = JSON.parse(raw);
        pass("manifest.json is valid JSON");
    } catch (e) {
        return fail("manifest.json syntax is valid JSON", e);
    }

    const requiredFields = ["display_name", "loading_order", "js", "css", "version"];
    for (const field of requiredFields) {
        if (manifest[field] !== undefined) {
            pass(`manifest has required field '${field}' (${JSON.stringify(manifest[field])})`);
        } else {
            fail(`manifest contains required field '${field}'`);
        }
    }

    // Check referenced JS
    if (manifest.js) {
        const jsFile = path.join(ROOT_DIR, manifest.js);
        if (fs.existsSync(jsFile)) {
            pass(`Referenced JS entry point exists: ${manifest.js}`);
        } else {
            fail(`Referenced JS entry point exists on disk: ${manifest.js}`);
        }
    }

    // Check referenced CSS
    if (manifest.css) {
        const cssFile = path.join(ROOT_DIR, manifest.css);
        if (fs.existsSync(cssFile)) {
            pass(`Referenced CSS stylesheet exists: ${manifest.css}`);
        } else {
            fail(`Referenced CSS stylesheet exists on disk: ${manifest.css}`);
        }
    }
}

/**
 * 2. Validate JavaScript Syntax
 */
function checkJavaScript() {
    logHeader("2. JavaScript Syntax & Compilation Checks");
    const jsFiles = [
        path.join(ROOT_DIR, "index.js"),
        path.join(ROOT_DIR, "scripts", "check-codebase.js")
    ];

    const serverFile = path.join(ROOT_DIR, "server.js");
    if (fs.existsSync(serverFile)) {
        jsFiles.push(serverFile);
    }

    for (const file of jsFiles) {
        const rel = path.relative(ROOT_DIR, file);
        try {
            const code = fs.readFileSync(file, "utf8");
            new vm.Script(code, { filename: rel });
            pass(`Valid JavaScript syntax: ${rel}`);
        } catch (e) {
            fail(`Valid JavaScript syntax: ${rel}`, e);
        }
    }
}

/**
 * 3. Validate HTML & Inline Scripts / Event Handlers
 */
function checkHTML() {
    logHeader("3. HTML & Subresource Integrity Validation");
    const htmlFiles = [path.join(ROOT_DIR, "game", "index.html")];
    const testHarness = path.join(ROOT_DIR, "test_harness.html");
    if (fs.existsSync(testHarness)) {
        htmlFiles.push(testHarness);
    }

    for (const htmlPath of htmlFiles) {
        const relHtml = path.relative(ROOT_DIR, htmlPath);
        if (!fs.existsSync(htmlPath)) {
            fail(`HTML file exists: ${relHtml}`);
            continue;
        }

        const content = fs.readFileSync(htmlPath, "utf8");
        const baseDir = path.dirname(htmlPath);

        // Check for HTML entity corruption in inline event handlers
        const handlerRegex = /\s(on[a-z]+)\s*=\s*(["'])(.*?)\2/gi;
        let match;
        let handlersChecked = 0;
        let handlerErrors = 0;

        while ((match = handlerRegex.exec(content)) !== null) {
            const attr = match[1];
            const jsCode = match[3];
            handlersChecked++;

            // Detect corrupt entity quotes like &#34; or &quot;
            if (/&#34;|&quot;|&#x22;/i.test(jsCode)) {
                handlerErrors++;
                fail(`Corrupt HTML entity quotation found in ${relHtml} attribute '${attr}': "${jsCode}"`);
            }

            // Test compilation of inline JS
            try {
                vm.compileFunction(jsCode, [], { filename: `${relHtml}:${attr}` });
            } catch (e) {
                handlerErrors++;
                fail(`Invalid JavaScript syntax in ${relHtml} attribute '${attr}': "${jsCode}"`, e);
            }
        }

        if (handlerErrors === 0) {
            pass(`All ${handlersChecked} inline event handlers in ${relHtml} are syntactically valid`);
        }

        // Check inline <script> tags
        const scriptTagRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        let scriptMatch;
        let scriptsChecked = 0;

        while ((scriptMatch = scriptTagRegex.exec(content)) !== null) {
            const scriptContent = scriptMatch[1].trim();
            if (!scriptContent) continue;
            scriptsChecked++;
            try {
                new vm.Script(scriptContent, { filename: `${relHtml}:<inline-script-${scriptsChecked}>` });
                pass(`Valid inline <script> block #${scriptsChecked} in ${relHtml}`);
            } catch (e) {
                fail(`Syntax error in inline <script> block #${scriptsChecked} in ${relHtml}`, e);
            }
        }

        // Check local referenced stylesheets & scripts
        const srcRefRegex = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
        let refMatch;
        while ((refMatch = srcRefRegex.exec(content)) !== null) {
            let refUrl = refMatch[1].trim();
            // Skip anchors, data URLs, external protocols, and template vars
            if (!refUrl || refUrl.startsWith("#") || refUrl.startsWith("data:") || /^[a-z]+:\/\//i.test(refUrl)) {
                continue;
            }
            // Strip query params & hashes
            const cleanUrl = refUrl.split("?")[0].split("#")[0];
            const targetPath = path.resolve(baseDir, cleanUrl);
            if (fs.existsSync(targetPath)) {
                pass(`Referenced subresource exists: ${cleanUrl} (${path.relative(ROOT_DIR, targetPath)})`);
            } else {
                fail(`Missing subresource referenced in ${relHtml}: ${cleanUrl} (resolved: ${targetPath})`);
            }
        }
    }
}

/**
 * 4. Validate Asset Integrity
 */
function checkAssets() {
    logHeader("4. Core Game Runtime Asset Completeness");
    const essentialAssets = [
        "game/index.html",
        "game/bundle.js",
        "game/main.css",
        "game/async-resources.css",
        "game/favicon.ico",
        "game/res/fonts/GameFont.woff2",
        "game/res/sounds/sfx.mp3",
        "game/res/sounds/music/theme-short.mp3",
        "style.css",
        "index.js"
    ];

    for (const asset of essentialAssets) {
        const fullPath = path.join(ROOT_DIR, asset);
        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            if (stats.size > 0) {
                pass(`Asset verified: ${asset} (${(stats.size / 1024).toFixed(1)} KB)`);
            } else {
                fail(`Asset file is empty (0 bytes): ${asset}`);
            }
        } else {
            fail(`Critical asset missing on disk: ${asset}`);
        }
    }
}

/**
 * 5. Validate CSS Basic Syntax (Brace balancing)
 */
function checkCSS() {
    logHeader("5. CSS Stylesheet Syntax & Structure");
    const cssFiles = [
        path.join(ROOT_DIR, "style.css"),
        path.join(ROOT_DIR, "game", "main.css")
    ];

    for (const cssPath of cssFiles) {
        const rel = path.relative(ROOT_DIR, cssPath);
        if (!fs.existsSync(cssPath)) {
            fail(`CSS file exists: ${rel}`);
            continue;
        }

        const content = fs.readFileSync(cssPath, "utf8");
        let openBraces = 0;
        let valid = true;

        for (let i = 0; i < content.length; i++) {
            if (content[i] === "{") openBraces++;
            else if (content[i] === "}") {
                openBraces--;
                if (openBraces < 0) {
                    valid = false;
                    break;
                }
            }
        }

        if (valid && openBraces === 0) {
            pass(`CSS braces balanced and structurally valid: ${rel}`);
        } else {
            fail(`CSS structure has unbalanced braces in ${rel}`);
        }
    }
}

// Run all test suites
console.log(`${COLORS.bright}🚀 Starting SillyTavern Shapez Codebase Checker...${COLORS.reset}`);
const startTime = Date.now();

checkManifest();
checkJavaScript();
checkHTML();
checkAssets();
checkCSS();

const elapsed = Date.now() - startTime;
console.log(`\n${COLORS.bright}--------------------------------------------------${COLORS.reset}`);
console.log(`${COLORS.bright}Total Checks Completed:${COLORS.reset} ${totalChecks}`);
console.log(`${COLORS.bright}Execution Time:${COLORS.reset} ${elapsed}ms`);

if (totalErrors > 0) {
    console.error(`\n${COLORS.bright}${COLORS.red}✖ FAILED: ${totalErrors} error(s), ${totalWarnings} warning(s) found.${COLORS.reset}\n`);
    process.exit(1);
} else {
    console.log(`\n${COLORS.bright}${COLORS.green}✔ SUCCESS: All codebase checks passed cleanly with 0 errors!${COLORS.reset}\n`);
    process.exit(0);
}
