import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  dev: {
    server: { port: 3001 },
  },
  manifest: {
    name: "SEO Lens",
    description: "Instant SEO auditing for any webpage",
    permissions: ["activeTab", "sidePanel", "tabs", "webNavigation"],
    host_permissions: ["<all_urls>"],
    side_panel: {
      default_path: "sidepanel.html",
    },
    action: {
      default_title: "SEO Lens",
    },
  },
});
