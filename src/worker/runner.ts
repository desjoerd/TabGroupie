import { SettingValues } from "../shared/SettingsStore";
import { groupBy } from "./collections";
import { TabGroup } from "./model/TabGroup";
import {
  ChromeTabsController,
  ChromeTabsControllerFactory,
} from "./services/ChromeTabsController";
import { TabGrouper } from "./services/TabGrouper";
import { DefaultTabKeyFactory } from "./services/TabKeyFactory";

export async function run(settings: SettingValues) {
  const controllers = await new ChromeTabsControllerFactory(
    new DefaultTabKeyFactory()
  ).create();

  for (let controller of controllers) {
    await runOnWindow(controller, settings);
  }
}

async function runOnWindow(
  controller: ChromeTabsController,
  settings: SettingValues
) {
  const tabGrouper = new TabGrouper(settings);

  let tabItems = [...tabGrouper.run(controller.getTabReferences())];

  await controller.updateChrome(tabItems);
}
