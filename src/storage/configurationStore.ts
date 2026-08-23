import type { AppConfiguration } from "../domain/types";
import { validateConfiguration } from "../import/configurationSchema";

export const CONFIGURATION_STORAGE_KEY = "etown-next-class.configuration.v1";
export const APP_STORAGE_PREFIX = "etown-next-class.";

export interface ConfigurationStore {
  load(): AppConfiguration | null;
  save(configuration: AppConfiguration): void;
  eraseAllAppData(): void;
}

export function createConfigurationStore(storage: Storage): ConfigurationStore {
  return {
    load() {
      const serialized = storage.getItem(CONFIGURATION_STORAGE_KEY);
      if (!serialized) return null;
      try {
        return validateConfiguration(JSON.parse(serialized) as unknown);
      } catch {
        storage.removeItem(CONFIGURATION_STORAGE_KEY);
        return null;
      }
    },
    save(configuration) {
      const validated = validateConfiguration(configuration);
      storage.setItem(CONFIGURATION_STORAGE_KEY, JSON.stringify(validated));
    },
    eraseAllAppData() {
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(APP_STORAGE_PREFIX)) keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
    },
  };
}
