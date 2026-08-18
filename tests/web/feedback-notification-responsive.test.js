const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");

test("top-shell feedback notifications use a viewport overlay on mobile", () => {
  const stylesheet = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "globals.css"), "utf8");
  const notificationBell = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "feedback-notification-bell.tsx"), "utf8");
  const topPanelStart = stylesheet.indexOf(".feedback-notification-panel-top");
  const topPanelEnd = stylesheet.indexOf("}", topPanelStart);
  const topPanelRule = stylesheet.slice(topPanelStart, topPanelEnd);
  const mobilePanelStart = stylesheet.lastIndexOf(".feedback-notification-panel-top");
  const mobilePanelEnd = stylesheet.indexOf("}", mobilePanelStart);
  const mobilePanelRule = stylesheet.slice(mobilePanelStart, mobilePanelEnd);

  assert.notEqual(topPanelStart, -1);
  assert.match(topPanelRule, /position: fixed;/);
  assert.match(topPanelRule, /width: min\(23rem, calc\(100vw - 1\.3rem\)\);/);
  assert.notEqual(mobilePanelStart, -1);
  assert.match(mobilePanelRule, /left: max\(0\.65rem, env\(safe-area-inset-left\)\);/);
  assert.match(mobilePanelRule, /width: auto;/);
  assert.match(mobilePanelRule, /max-height: calc\(100dvh - env\(safe-area-inset-top\) - 5\.5rem\);/);
  assert.match(notificationBell, /createPortal\(panel, document\.body\)/);
  assert.match(notificationBell, /feedback-notification-panel-\$\{placement\}/);
  assert.match(notificationBell, /panelRef\.current\?\.contains/);
});

test("menu feedback notifications stay within the hamburger panel", () => {
  const stylesheet = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "globals.css"), "utf8");

  assert.match(stylesheet, /\.feedback-notification-panel-menu\s*\{[^}]*width: 100%;[^}]*overflow-x: hidden;/);
  assert.match(stylesheet, /\.feedback-notification-panel-menu \.feedback-notification-header\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(stylesheet, /\.feedback-notification-panel-menu \.feedback-notification-item-topline\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(stylesheet, /\.feedback-notification-panel-menu \.feedback-notification-item p\s*\{[^}]*overflow-wrap: anywhere;/);
});
