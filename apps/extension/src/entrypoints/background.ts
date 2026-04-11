export default defineBackground(() => {
  // Open the side panel when the extension action (toolbar icon) is clicked
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await browser.sidePanel.open({ tabId: tab.id });
    }
  });
});
