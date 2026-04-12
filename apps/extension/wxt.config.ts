import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  manifest: {
    name: "SEO Lens",
    description: "Instant SEO auditing for any webpage",
    version: "0.0.1",
    permissions: ["activeTab", "sidePanel", "tabs", "webNavigation"],
    side_panel: {
      default_path: "sidepanel.html",
    },
    action: {
      default_title: "SEO Lens",
    },
  },
});
