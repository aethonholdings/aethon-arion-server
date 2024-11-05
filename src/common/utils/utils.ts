import { KeyBuilder } from "src/common/types/server.types";

export function log(event: string, message: string): string {
    message = message.replace(/\n/g, " ").replace(/\s+/g, " ");
    return `${event}: ${message}`;
}

export function getKey(keyBuilder: KeyBuilder): string {
    return keyBuilder
        .map((item) => JSON.stringify(item))
        .join(":")
        .replace(/\r?\n|\r/g, "")
        .replace(/\s+/g, "")
        .replace(/["']/g, "");
}
