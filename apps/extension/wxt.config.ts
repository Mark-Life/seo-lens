import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  dev: {
    server: { port: 3001 },
  },
  manifest: {
    name: "SEO Lens — SEO audit for AI coding",
    short_name: "SEO Lens",
    description:
      "Instant SEO audit in the side panel: metadata, headings, JSON-LD, social tags. Copy findings straight into your AI coding agent.",
    homepage_url: "https://www.seo-lens.dev",
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
