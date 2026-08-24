import { registerSW } from "virtual:pwa-register";

import { AppController } from "./app/appController";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root is missing");

const controller = new AppController(root);
controller.start();

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    controller.setUpdateAvailable(async () => {
      await updateServiceWorker?.(true);
    });
  },
});
